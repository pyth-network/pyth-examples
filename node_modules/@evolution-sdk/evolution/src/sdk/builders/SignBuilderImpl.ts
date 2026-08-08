/**
 * SignBuilder Implementation
 *
 * Handles transaction signing by delegating to the wallet's signTx Effect method.
 * The SignBuilder is responsible for:
 * 1. Providing the transaction and UTxO context to the wallet
 * 2. Managing the transition from unsigned to signed transaction
 * 3. Creating the SubmitBuilder for transaction submission
 *
 * The actual signing logic (determining required signers, creating witnesses)
 * is the wallet's responsibility.
 *
 * @since 2.0.0
 * @category builders
 */

import { Effect } from "effect"

import * as Script from "../../Script.js"
import * as Transaction from "../../Transaction.js"
import * as TransactionHash from "../../TransactionHash.js"
import * as TransactionWitnessSet from "../../TransactionWitnessSet.js"
import type * as TxOut from "../../TxOut.js"
import { hashTransaction } from "../../utils/Hash.js"
import * as CoreUTxO from "../../UTxO.js"
import type * as Provider from "../provider/Provider.js"
import type * as WalletNew from "../wallet/WalletNew.js"
import type { SignBuilder, SignBuilderEffect } from "./SignBuilder.js"
import { makeSubmitBuilder } from "./SubmitBuilderImpl.js"
import { type ChainResult, TransactionBuilderError } from "./TransactionBuilder.js"

// ============================================================================
// SignBuilder Factory
// ============================================================================

/**
 * Wallet type - can be SigningWallet or ApiWallet (both have Effect.signTx)
 */
type Wallet = WalletNew.SigningWallet | WalletNew.ApiWallet

/**
 * Create a SignBuilder instance for a built transaction.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeSignBuilder = (params: {
  transaction: Transaction.Transaction
  transactionWithFakeWitnesses: Transaction.Transaction
  fee: bigint
  utxos: ReadonlyArray<CoreUTxO.UTxO>
  referenceUtxos: ReadonlyArray<CoreUTxO.UTxO>
  provider: Provider.Provider
  wallet: Wallet
  // Data for lazy chainResult computation
  outputs: ReadonlyArray<TxOut.TransactionOutput>
  availableUtxos: ReadonlyArray<CoreUTxO.UTxO>
}): SignBuilder => {
  const {
    availableUtxos,
    fee,
    outputs,
    provider,
    referenceUtxos,
    transaction,
    transactionWithFakeWitnesses,
    utxos,
    wallet
  } = params

  // Memoized chainResult - computed once on first access
  let _chainResult: ChainResult | undefined
  const chainResult = (): ChainResult => {
    if (_chainResult) return _chainResult

    const consumed = utxos
    const txHash = hashTransaction(transaction.body)

    const created: Array<CoreUTxO.UTxO> = outputs.map(
      (output, index) =>
        new CoreUTxO.UTxO({
          transactionId: txHash,
          index: BigInt(index),
          address: output.address,
          assets: output.assets,
          datumOption: output.datumOption,
          scriptRef: output.scriptRef ? Script.fromCBOR(output.scriptRef.bytes) : undefined
        })
    )

    const consumedSet = new Set(consumed.map((u) => CoreUTxO.toOutRefString(u)))
    const remaining = availableUtxos.filter((u) => !consumedSet.has(CoreUTxO.toOutRefString(u)))
    const available = [...remaining, ...created]

    _chainResult = { consumed, available, txHash: TransactionHash.toHex(txHash) }
    return _chainResult
  }

  // ============================================================================
  // Effect Namespace Implementation
  // ============================================================================

  const signEffect: SignBuilderEffect = {
    /**
     * Sign the transaction by delegating to the wallet's Effect.signTx method.
     *
     * The wallet will:
     * 1. Determine which keys are required based on transaction inputs/outputs
     * 2. Create VKey witnesses for each required signature
     * 3. Return the witness set
     *
     * SignBuilder then assembles the signed transaction and returns SubmitBuilder.
     */
    sign: () =>
      Effect.gen(function* () {
        yield* Effect.logDebug("Starting transaction signing (delegating to wallet Effect)")

        // Delegate to wallet's Effect.signTx with UTxO context
        const walletWitnessSet = yield* wallet.Effect.signTx(transaction, { utxos, referenceUtxos }).pipe(
          Effect.mapError(
            (walletError) =>
              new TransactionBuilderError({
                message: `Failed to sign transaction: ${walletError.message}`,
                cause: walletError
              })
          )
        )

        yield* Effect.logDebug(
          `Received witness set from wallet: ${walletWitnessSet.vkeyWitnesses?.length ?? 0} VKey witnesses`
        )

        // Merge wallet's witness set with existing transaction witness set (which may contain attached scripts)
        const mergedWitnessSet = new TransactionWitnessSet.TransactionWitnessSet({
          vkeyWitnesses: [...(transaction.witnessSet.vkeyWitnesses ?? []), ...(walletWitnessSet.vkeyWitnesses ?? [])],
          nativeScripts: transaction.witnessSet.nativeScripts, // Keep attached scripts
          bootstrapWitnesses: [
            ...(transaction.witnessSet.bootstrapWitnesses ?? []),
            ...(walletWitnessSet.bootstrapWitnesses ?? [])
          ],
          plutusV1Scripts: transaction.witnessSet.plutusV1Scripts, // Keep attached scripts
          plutusV2Scripts: transaction.witnessSet.plutusV2Scripts, // Keep attached scripts
          plutusV3Scripts: transaction.witnessSet.plutusV3Scripts, // Keep attached scripts
          plutusData: transaction.witnessSet.plutusData, // Keep datum information
          redeemers: transaction.witnessSet.redeemers // Keep redeemers
        })

        yield* Effect.logDebug(
          `Merged witness set: ${mergedWitnessSet.vkeyWitnesses?.length ?? 0} VKey witnesses, ${mergedWitnessSet.nativeScripts?.length ?? 0} native scripts`
        )

        // Create signed transaction by combining transaction body with merged witness set
        const signedTransaction = new Transaction.Transaction({
          body: transaction.body,
          witnessSet: mergedWitnessSet,
          isValid: transaction.isValid,
          auxiliaryData: transaction.auxiliaryData
        })

        yield* Effect.logDebug("Transaction signed successfully")

        // Return SubmitBuilder
        return makeSubmitBuilder(signedTransaction, mergedWitnessSet, provider)
      }),

    /**
     * Sign and submit the transaction in one step.
     *
     * Convenience method that combines sign() and submit().
     * Returns the transaction hash on success.
     */
    signAndSubmit: () =>
      Effect.gen(function* () {
        const submitBuilder = yield* signEffect.sign()
        return yield* submitBuilder.Effect.submit()
      }),

    /**
     * Sign the transaction using a pre-created witness set.
     *
     * This method allows you to provide your own witness set instead of delegating
     * to the wallet. Useful for:
     * - Hardware wallets where signing happens externally
     * - Multi-sig workflows where witnesses are collected separately
     * - Testing with pre-generated witnesses
     *
     * The witness set should contain VKey witnesses for all required signatures.
     */
    signWithWitness: (witnessSet: TransactionWitnessSet.TransactionWitnessSet) =>
      Effect.gen(function* () {
        yield* Effect.logDebug("Signing transaction with provided witness set")

        // Create signed transaction by combining transaction body with provided witness set
        const signedTransaction = new Transaction.Transaction({
          body: transaction.body,
          witnessSet,
          isValid: transaction.isValid,
          auxiliaryData: transaction.auxiliaryData
        })

        yield* Effect.logDebug(`Transaction signed with ${witnessSet.vkeyWitnesses?.length ?? 0} VKey witnesses`)

        // Return SubmitBuilder
        return makeSubmitBuilder(signedTransaction, witnessSet, provider)
      }),

    /**
     * Assemble a transaction from multiple witness sets (multi-sig).
     *
     * Combines witnesses from multiple parties into a single transaction.
     * Use this for multi-signature transactions where:
     * - Multiple parties need to sign independently
     * - Witnesses are collected and combined at assembly time
     *
     * All witness sets are merged into a single complete witness set.
     */
    assemble: (witnesses: ReadonlyArray<TransactionWitnessSet.TransactionWitnessSet>) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(`Assembling transaction from ${witnesses.length} witness sets`)

        // Start with the transaction's existing witness set (contains attached scripts, redeemers, etc.)
        // Then merge in the provided witness sets (which contain signatures from multiple parties)
        const mergedWitnessSet = witnesses.reduce(
          (acc, ws) =>
            new TransactionWitnessSet.TransactionWitnessSet({
              vkeyWitnesses: [...(acc.vkeyWitnesses ?? []), ...(ws.vkeyWitnesses ?? [])],
              nativeScripts: [...(acc.nativeScripts ?? []), ...(ws.nativeScripts ?? [])],
              bootstrapWitnesses: [...(acc.bootstrapWitnesses ?? []), ...(ws.bootstrapWitnesses ?? [])],
              plutusV1Scripts: [...(acc.plutusV1Scripts ?? []), ...(ws.plutusV1Scripts ?? [])],
              plutusV2Scripts: [...(acc.plutusV2Scripts ?? []), ...(ws.plutusV2Scripts ?? [])],
              plutusV3Scripts: [...(acc.plutusV3Scripts ?? []), ...(ws.plutusV3Scripts ?? [])],
              plutusData: [...(acc.plutusData ?? []), ...(ws.plutusData ?? [])],
              redeemers: acc.redeemers
            }),
          // Start from transaction's witness set (NOT empty) to preserve attached scripts
          new TransactionWitnessSet.TransactionWitnessSet({
            vkeyWitnesses: transaction.witnessSet.vkeyWitnesses ?? [],
            nativeScripts: transaction.witnessSet.nativeScripts ?? [],
            bootstrapWitnesses: transaction.witnessSet.bootstrapWitnesses ?? [],
            plutusV1Scripts: transaction.witnessSet.plutusV1Scripts ?? [],
            plutusV2Scripts: transaction.witnessSet.plutusV2Scripts ?? [],
            plutusV3Scripts: transaction.witnessSet.plutusV3Scripts ?? [],
            plutusData: transaction.witnessSet.plutusData ?? [],
            redeemers: transaction.witnessSet.redeemers
          })
        )

        yield* Effect.logDebug(
          `Merged witness set contains ${mergedWitnessSet.vkeyWitnesses?.length ?? 0} VKey witnesses`
        )

        // Create signed transaction
        const signedTransaction = new Transaction.Transaction({
          body: transaction.body,
          witnessSet: mergedWitnessSet,
          isValid: transaction.isValid,
          auxiliaryData: transaction.auxiliaryData
        })

        // Return SubmitBuilder
        return makeSubmitBuilder(signedTransaction, mergedWitnessSet, provider)
      }),

    /**
     * Create a partial signature for multi-sig workflows.
     *
     * Signs the transaction with the wallet's keys and returns a witness set
     * WITHOUT creating a complete signed transaction. This allows:
     * - Multi-party signing workflows
     * - Collecting witnesses independently
     * - Combining witnesses later with assemble()
     *
     * Returns the witness set for this wallet's contribution only.
     */
    partialSign: () =>
      Effect.gen(function* () {
        yield* Effect.logDebug("Creating partial signature (delegating to wallet Effect)")
        yield* Effect.logDebug(`[partialSign] referenceUtxos count: ${referenceUtxos.length}`)

        // Delegate to wallet's Effect.signTx to get witness set
        const witnessSet = yield* wallet.Effect.signTx(transaction, { utxos, referenceUtxos }).pipe(
          Effect.mapError(
            (walletError) =>
              new TransactionBuilderError({
                message: `Failed to create partial signature: ${walletError.message}`,
                cause: walletError
              })
          )
        )

        yield* Effect.logDebug(`Created partial signature: ${witnessSet.vkeyWitnesses?.length ?? 0} VKey witnesses`)

        // Return just the witness set (not a full transaction)
        return witnessSet
      }),

    getWitnessSet: () => Effect.succeed(transaction.witnessSet),

    toTransaction: () => Effect.succeed(transaction),

    toTransactionWithFakeWitnesses: () => Effect.succeed(transactionWithFakeWitnesses),

    estimateFee: () => Effect.succeed(fee)
  }

  // ============================================================================
  // Promise-based API (using Effect.runPromise)
  // ============================================================================

  return {
    Effect: signEffect,
    chainResult,
    sign: () => Effect.runPromise(signEffect.sign()),
    signAndSubmit: () => Effect.runPromise(signEffect.signAndSubmit()),
    signWithWitness: (witnessSet: TransactionWitnessSet.TransactionWitnessSet) =>
      Effect.runPromise(signEffect.signWithWitness(witnessSet)),
    assemble: (witnesses: ReadonlyArray<TransactionWitnessSet.TransactionWitnessSet>) =>
      Effect.runPromise(signEffect.assemble(witnesses)),
    partialSign: () => Effect.runPromise(signEffect.partialSign()),
    getWitnessSet: () => Effect.runPromise(signEffect.getWitnessSet()),
    toTransaction: () => Effect.runPromise(signEffect.toTransaction()),
    toTransactionWithFakeWitnesses: () => Effect.runPromise(signEffect.toTransactionWithFakeWitnesses()),
    estimateFee: () => Effect.runPromise(signEffect.estimateFee())
  }
}
