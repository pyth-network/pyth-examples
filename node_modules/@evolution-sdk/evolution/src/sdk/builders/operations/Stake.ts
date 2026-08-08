/**
 * Stake operations - register, deregister stake credentials and withdraw rewards.
 *
 * @module operations/Stake
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as Bytes from "../../../Bytes.js"
import * as Certificate from "../../../Certificate.js"
import * as RewardAccount from "../../../RewardAccount.js"
import * as RedeemerBuilder from "../RedeemerBuilder.js"
import { TransactionBuilderError, type TxBuilderConfig, TxBuilderConfigTag, TxContext } from "../TransactionBuilder.js"
import type {
  DelegateToDRepParams,
  DelegateToParams,
  DelegateToPoolAndDRepParams,
  DelegateToPoolParams,
  DeregisterStakeParams,
  RegisterAndDelegateToParams,
  RegisterStakeParams,
  WithdrawParams
} from "./Operations.js"

/**
 * Creates a ProgramStep for registerStake operation.
 * Adds a RegCert (Conway-era) certificate to the transaction.
 * Requires keyDeposit from protocol parameters.
 *
 * @since 2.0.0
 * @category programs
 */
export const createRegisterStakeProgram = (
  params: RegisterStakeParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const config = yield* TxBuilderConfigTag

    // Get keyDeposit from protocol parameters via provider
    if (!config.provider) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Provider required to fetch keyDeposit for stake registration"
        })
      )
    }

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential registration"
        })
      )
    }

    const protocolParams = yield* config.provider.Effect.getProtocolParameters().pipe(
      Effect.mapError(
        (err) =>
          new TransactionBuilderError({
            message: `Failed to fetch protocol parameters: ${err.message}`
          })
      )
    )
    const keyDeposit = protocolParams.keyDeposit

    // Create RegCert (Conway-era) certificate with deposit
    const certificate = new Certificate.RegCert({
      stakeCredential: params.stakeCredential,
      coin: keyDeposit
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(certKey, {
            tag: "cert",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(certKey, {
            tag: "cert",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    yield* Effect.logDebug(`[RegisterStake] Added RegCert certificate with deposit ${keyDeposit}`)
  })

/**
 * Creates a ProgramStep for delegateTo operation.
 * Adds delegation certificate(s) to the transaction.
 *
 * Supports three modes:
 * - Pool only: Creates StakeDelegation certificate
 * - DRep only: Creates VoteDelegCert certificate (Conway)
 * - Both: Creates StakeVoteDelegCert certificate (Conway)
 *
 * For script-controlled credentials, tracks redeemer for evaluation.
 *
 * @since 2.0.0
 * @category programs
 */
export const createDelegateToProgram = (
  params: DelegateToParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Validate at least one delegation target
    if (!params.poolKeyHash && !params.drep) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "delegateTo requires either poolKeyHash or drep (or both)"
        })
      )
    }

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential delegation"
        })
      )
    }

    // Create appropriate certificate based on what's provided
    let certificate: Certificate.Certificate

    if (params.poolKeyHash && params.drep) {
      // Both pool and DRep - use StakeVoteDelegCert (Conway)
      certificate = new Certificate.StakeVoteDelegCert({
        stakeCredential: params.stakeCredential,
        poolKeyHash: params.poolKeyHash,
        drep: params.drep
      })
    } else if (params.poolKeyHash) {
      // Pool only - use StakeDelegation
      certificate = new Certificate.StakeDelegation({
        stakeCredential: params.stakeCredential,
        poolKeyHash: params.poolKeyHash
      })
    } else {
      // DRep only - use VoteDelegCert (Conway)
      certificate = new Certificate.VoteDelegCert({
        stakeCredential: params.stakeCredential,
        drep: params.drep!
      })
    }

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(certKey, {
            tag: "cert",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(certKey, {
            tag: "cert",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    const delegationType =
      params.poolKeyHash && params.drep
        ? "StakeVoteDelegCert (pool + DRep)"
        : params.poolKeyHash
          ? "StakeDelegation (pool)"
          : "VoteDelegCert (DRep)"

    yield* Effect.logDebug(`[DelegateTo] Added ${delegationType} certificate`)
  })

/**
 * Creates a ProgramStep for delegateToPool operation.
 * Adds a StakeDelegation certificate to delegate stake to a pool.
 *
 * For script-controlled credentials, tracks redeemer for evaluation.
 *
 * @since 2.0.0
 * @category programs
 */
export const createDelegateToPoolProgram = (
  params: DelegateToPoolParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential delegation"
        })
      )
    }

    // Create StakeDelegation certificate
    const certificate = new Certificate.StakeDelegation({
      stakeCredential: params.stakeCredential,
      poolKeyHash: params.poolKeyHash
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(certKey, {
            tag: "cert",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(certKey, {
            tag: "cert",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    yield* Effect.logDebug(`[DelegateToPool] Added StakeDelegation certificate`)
  })

/**
 * Creates a ProgramStep for delegateToDRep operation.
 * Adds a VoteDelegCert certificate to delegate voting power to a DRep.
 *
 * For script-controlled credentials, tracks redeemer for evaluation.
 *
 * @since 2.0.0
 * @category programs
 */
export const createDelegateToDRepProgram = (
  params: DelegateToDRepParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential delegation"
        })
      )
    }

    // Create VoteDelegCert certificate
    const certificate = new Certificate.VoteDelegCert({
      stakeCredential: params.stakeCredential,
      drep: params.drep
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(certKey, {
            tag: "cert",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(certKey, {
            tag: "cert",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    yield* Effect.logDebug(`[DelegateToDRep] Added VoteDelegCert certificate`)
  })

/**
 * Creates a ProgramStep for delegateToPoolAndDRep operation.
 * Adds a StakeVoteDelegCert certificate to delegate both stake and voting power.
 *
 * For script-controlled credentials, tracks redeemer for evaluation.
 *
 * @since 2.0.0
 * @category programs
 */
export const createDelegateToPoolAndDRepProgram = (
  params: DelegateToPoolAndDRepParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential delegation"
        })
      )
    }

    // Create StakeVoteDelegCert certificate
    const certificate = new Certificate.StakeVoteDelegCert({
      stakeCredential: params.stakeCredential,
      poolKeyHash: params.poolKeyHash,
      drep: params.drep
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(certKey, {
            tag: "cert",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(certKey, {
            tag: "cert",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    yield* Effect.logDebug(`[DelegateToPoolAndDRep] Added StakeVoteDelegCert certificate`)
  })

/**
 * Creates a ProgramStep for registerAndDelegateTo operation.
 * Combines registration and delegation into a single certificate, saving fees.
 *
 * Supports three modes:
 * - Pool only: Creates StakeRegDelegCert certificate
 * - DRep only: Creates VoteRegDelegCert certificate (Conway)
 * - Both: Creates StakeVoteRegDelegCert certificate (Conway)
 *
 * For script-controlled credentials, tracks redeemer for evaluation.
 *
 * @since 2.0.0
 * @category programs
 */
export const createRegisterAndDelegateToProgram = (
  params: RegisterAndDelegateToParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const config = yield* TxBuilderConfigTag

    // Validate at least one delegation target
    if (!params.poolKeyHash && !params.drep) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "registerAndDelegateTo requires either poolKeyHash or drep (or both)"
        })
      )
    }

    // Get keyDeposit from protocol parameters via provider
    if (!config.provider) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Provider required to fetch keyDeposit for stake registration"
        })
      )
    }

    const protocolParams = yield* config.provider.Effect.getProtocolParameters().pipe(
      Effect.mapError(
        (err) =>
          new TransactionBuilderError({
            message: `Failed to fetch protocol parameters: ${err.message}`
          })
      )
    )
    const keyDeposit = protocolParams.keyDeposit

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential registration and delegation"
        })
      )
    }

    // Create appropriate certificate based on what's provided
    let certificate: Certificate.Certificate

    if (params.poolKeyHash && params.drep) {
      // Both pool and DRep - use StakeVoteRegDelegCert (Conway)
      certificate = new Certificate.StakeVoteRegDelegCert({
        stakeCredential: params.stakeCredential,
        poolKeyHash: params.poolKeyHash,
        drep: params.drep,
        coin: keyDeposit
      })
    } else if (params.poolKeyHash) {
      // Pool only - use StakeRegDelegCert
      certificate = new Certificate.StakeRegDelegCert({
        stakeCredential: params.stakeCredential,
        poolKeyHash: params.poolKeyHash,
        coin: keyDeposit
      })
    } else {
      // DRep only - use VoteRegDelegCert (Conway)
      certificate = new Certificate.VoteRegDelegCert({
        stakeCredential: params.stakeCredential,
        drep: params.drep!,
        coin: keyDeposit
      })
    }

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(certKey, {
            tag: "cert",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(certKey, {
            tag: "cert",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    const delegationType =
      params.poolKeyHash && params.drep
        ? "StakeVoteRegDelegCert (pool + DRep)"
        : params.poolKeyHash
          ? "StakeRegDelegCert (pool)"
          : "VoteRegDelegCert (DRep)"

    yield* Effect.logDebug(`[RegisterAndDelegateTo] Added ${delegationType} certificate with deposit ${keyDeposit}`)
  })

/**
 * Creates a ProgramStep for deregisterStake operation.
 * Adds an UnregCert (Conway-era) certificate to the transaction.
 * Requires keyDeposit from protocol parameters for the refund.
 *
 * For script-controlled credentials, tracks redeemer for evaluation.
 *
 * @since 2.0.0
 * @category programs
 */
export const createDeregisterStakeProgram = (
  params: DeregisterStakeParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const config = yield* TxBuilderConfigTag

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential deregistration"
        })
      )
    }

    // Get keyDeposit from protocol parameters via provider
    if (!config.provider) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Provider required to fetch keyDeposit for stake deregistration"
        })
      )
    }

    const protocolParams = yield* config.provider.Effect.getProtocolParameters().pipe(
      Effect.mapError(
        (err) =>
          new TransactionBuilderError({
            message: `Failed to fetch protocol parameters: ${err.message}`
          })
      )
    )
    const keyDeposit = protocolParams.keyDeposit

    // Create UnregCert (Conway-era) certificate with deposit refund
    const certificate = new Certificate.UnregCert({
      stakeCredential: params.stakeCredential,
      coin: keyDeposit
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        // Use credential hash as key for cert redeemers
        const certKey = `cert:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(certKey, {
            tag: "cert",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(certKey, {
            tag: "cert",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    yield* Effect.logDebug(`[DeregisterStake] Added UnregCert certificate with deposit refund ${keyDeposit}`)
  })

/**
 * Creates a ProgramStep for withdraw operation.
 * Adds a withdrawal entry to the transaction.
 *
 * For script-controlled credentials, tracks redeemer for evaluation.
 * Use amount: 0n to trigger stake validator without withdrawing (coordinator pattern).
 *
 * @since 2.0.0
 * @category programs
 */
export const createWithdrawProgram = (
  params: WithdrawParams,
  config: TxBuilderConfig
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Check if script-controlled
    const isScriptControlled = params.stakeCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled stake credential withdrawal"
        })
      )
    }

    // Resolve network ID from config
    const networkId = config.network === "Mainnet" ? 1 : 0

    // Create RewardAccount from stake credential
    const rewardAccount = new RewardAccount.RewardAccount({
      networkId,
      stakeCredential: params.stakeCredential
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        // Use reward account as key for reward redeemers
        const rewardKey = `reward:${Bytes.toHex(params.stakeCredential.hash)}`

        if (deferred._tag === "static") {
          newRedeemers = new Map(state.redeemers)
          newRedeemers.set(rewardKey, {
            tag: "reward",
            data: deferred.data,
            exUnits: undefined,
            label: params.label
          })
        } else {
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          newDeferredRedeemers.set(rewardKey, {
            tag: "reward",
            deferred,
            exUnits: undefined,
            label: params.label
          })
        }
      }

      // Add withdrawal to map
      const newWithdrawals = new Map(state.withdrawals)
      newWithdrawals.set(rewardAccount, params.amount)

      return {
        ...state,
        withdrawals: newWithdrawals,
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    yield* Effect.logDebug(
      `[Withdraw] Added withdrawal of ${params.amount} lovelace from ${Bytes.toHex(params.stakeCredential.hash)}`
    )
  })
