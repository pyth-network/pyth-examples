/**
 * Governance operations - DRep registration/update/deregistration and Constitutional Committee actions.
 *
 * @module operations/Governance
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as Bytes from "../../../Bytes.js"
import * as Certificate from "../../../Certificate.js"
import * as RedeemerBuilder from "../RedeemerBuilder.js"
import { TransactionBuilderError, TxBuilderConfigTag, TxContext } from "../TransactionBuilder.js"
import type {
  AuthCommitteeHotParams,
  DeregisterDRepParams,
  RegisterDRepParams,
  ResignCommitteeColdParams,
  UpdateDRepParams
} from "./Operations.js"

// ============================================================================
// DRep Operations
// ============================================================================

/**
 * Creates a ProgramStep for registerDRep operation.
 * Adds a RegDrepCert certificate to the transaction.
 * Requires drepDeposit from protocol parameters.
 *
 * @since 2.0.0
 * @category programs
 */
export const createRegisterDRepProgram = (
  params: RegisterDRepParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const config = yield* TxBuilderConfigTag

    // Check if script-controlled
    const isScriptControlled = params.drepCredential._tag === "ScriptHash"

    // Script-controlled DRep registration requires a redeemer (Publishing purpose).
    // The script is invoked to authorize the registration.
    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled DRep credential registration"
        })
      )
    }

    // Get drepDeposit from protocol parameters via provider
    if (!config.provider) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Provider required to fetch drepDeposit for DRep registration"
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
    const drepDeposit = protocolParams.drepDeposit

    // Create RegDrepCert certificate with deposit
    const certificate = new Certificate.RegDrepCert({
      drepCredential: params.drepCredential,
      coin: drepDeposit,
      anchor: params.anchor
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.drepCredential.hash)}`

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

    yield* Effect.logDebug(
      `[RegisterDRep] Added RegDrepCert for DRep ${Bytes.toHex(params.drepCredential.hash)} with deposit ${drepDeposit}`
    )
  })

/**
 * Creates a ProgramStep for updateDRep operation.
 * Adds an UpdateDrepCert certificate to the transaction.
 *
 * @since 2.0.0
 * @category programs
 */
export const createUpdateDRepProgram = (
  params: UpdateDRepParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Check if script-controlled
    const isScriptControlled = params.drepCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled DRep credential update"
        })
      )
    }

    // Create UpdateDrepCert certificate
    const certificate = new Certificate.UpdateDrepCert({
      drepCredential: params.drepCredential,
      anchor: params.anchor
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.drepCredential.hash)}`

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

    yield* Effect.logDebug(`[UpdateDRep] Added UpdateDrepCert for DRep ${Bytes.toHex(params.drepCredential.hash)}`)
  })

/**
 * Creates a ProgramStep for deregisterDRep operation.
 * Adds an UnregDrepCert certificate to the transaction and reclaims the deposit.
 *
 * @since 2.0.0
 * @category programs
 */
export const createDeregisterDRepProgram = (
  params: DeregisterDRepParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const config = yield* TxBuilderConfigTag

    // Get drepDeposit from protocol parameters via provider
    if (!config.provider) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Provider required to fetch drepDeposit for DRep deregistration"
        })
      )
    }

    // Check if script-controlled
    const isScriptControlled = params.drepCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled DRep credential deregistration"
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
    const drepDeposit = protocolParams.drepDeposit

    // Create UnregDrepCert certificate with deposit refund
    const certificate = new Certificate.UnregDrepCert({
      drepCredential: params.drepCredential,
      coin: drepDeposit
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.drepCredential.hash)}`

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

    yield* Effect.logDebug(
      `[DeregisterDRep] Added UnregDrepCert for DRep ${Bytes.toHex(params.drepCredential.hash)} with refund ${drepDeposit}`
    )
  })

// ============================================================================
// Constitutional Committee Operations
// ============================================================================

/**
 * Creates a ProgramStep for authCommitteeHot operation.
 * Adds an AuthCommitteeHotCert certificate to the transaction.
 * Authorizes a hot credential to act on behalf of a cold committee credential.
 *
 * @since 2.0.0
 * @category programs
 */
export const createAuthCommitteeHotProgram = (
  params: AuthCommitteeHotParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Check if script-controlled
    const isScriptControlled = params.coldCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled cold credential authorization"
        })
      )
    }

    // Create AuthCommitteeHotCert certificate
    const certificate = new Certificate.AuthCommitteeHotCert({
      committeeColdCredential: params.coldCredential,
      committeeHotCredential: params.hotCredential
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.coldCredential.hash)}`

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

    yield* Effect.logDebug(
      `[AuthCommitteeHot] Added AuthCommitteeHotCert for cold ${Bytes.toHex(params.coldCredential.hash)} to hot ${Bytes.toHex(params.hotCredential.hash)}`
    )
  })

/**
 * Creates a ProgramStep for resignCommitteeCold operation.
 * Adds a ResignCommitteeColdCert certificate to the transaction.
 * Submits resignation from constitutional committee membership.
 *
 * @since 2.0.0
 * @category programs
 */
export const createResignCommitteeColdProgram = (
  params: ResignCommitteeColdParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Check if script-controlled
    const isScriptControlled = params.coldCredential._tag === "ScriptHash"

    if (isScriptControlled && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled cold credential resignation"
        })
      )
    }

    // Create ResignCommitteeColdCert certificate
    const certificate = new Certificate.ResignCommitteeColdCert({
      committeeColdCredential: params.coldCredential,
      anchor: params.anchor
    })

    yield* Ref.update(ctx, (state) => {
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      // Track redeemer if script-controlled
      if (params.redeemer && isScriptControlled) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)
        const certKey = `cert:${Bytes.toHex(params.coldCredential.hash)}`

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

    yield* Effect.logDebug(
      `[ResignCommitteeCold] Added ResignCommitteeColdCert for cold credential ${Bytes.toHex(params.coldCredential.hash)}`
    )
  })
