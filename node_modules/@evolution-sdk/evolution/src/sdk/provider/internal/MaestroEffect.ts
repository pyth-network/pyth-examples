/**
 * @fileoverview Maestro Effect-based provider functions
 * Internal module implementing curry pattern with rate limiting
 */

import { Effect, Schema } from "effect"

import * as CoreAddress from "../../../Address.js"
import * as Bytes from "../../../Bytes.js"
import type * as Credential from "../../../Credential.js"
import * as PlutusData from "../../../Data.js"
import type * as DatumHash from "../../../DatumHash.js"
import * as Script from "../../../Script.js"
import * as ScriptRef from "../../../ScriptRef.js"
import * as Transaction from "../../../Transaction.js"
import * as TransactionHash from "../../../TransactionHash.js"
import type * as TransactionInput from "../../../TransactionInput.js"
import * as TxOut from "../../../TxOut.js"
import type * as CoreUTxO from "../../../UTxO.js"
import { ProviderError } from "../Provider.js"
import * as HttpUtils from "./HttpUtils.js"
import * as Maestro from "./Maestro.js"

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create common headers for Maestro API requests
 */
const createHeaders = (apiKey: string): Record<string, string> => ({
  "api-key": apiKey,
  "User-Agent": "evolution-sdk"
})

/**
 * Create headers with amounts-as-strings for UTxO queries
 * This is a Maestro-specific optimization for better decimal handling
 */
const createHeadersWithAmounts = (apiKey: string): Record<string, string> => ({
  "api-key": apiKey,
  "User-Agent": "evolution-sdk",
  "amounts-as-strings": "true"
})

/**
 * Wrap errors into ProviderError
 */
const wrapError = (operation: string) => (cause: unknown) =>
  Effect.fail(
    new ProviderError({
      message: `Maestro ${operation} failed`,
      cause
    })
  )

// ============================================================================
// Configuration
// ============================================================================

const TIMEOUT = 10_000 // 10 seconds timeout for requests

// ============================================================================
// Protocol Parameters
// ============================================================================

/**
 * Get protocol parameters from Maestro
 */
export const getProtocolParameters = (baseUrl: string, apiKey: string) =>
  HttpUtils.get(
    `${baseUrl}/protocol-parameters`,
    Maestro.MaestroTimestampedResponse(Maestro.MaestroProtocolParameters),
    createHeaders(apiKey)
  ).pipe(
    Effect.map((response) => Maestro.transformProtocolParameters(response.data)),
    Effect.timeout(TIMEOUT),
    Effect.catchAll(wrapError("get protocol parameters"))
  )

// ============================================================================
// UTxO Queries
// ============================================================================

/**
 * Get UTxOs by address with cursor pagination
 */
export const getUtxos =
  (baseUrl: string, apiKey: string) => (addressOrCredential: CoreAddress.Address | Credential.Credential) =>
    Effect.gen(function* () {
      if (!(addressOrCredential instanceof CoreAddress.Address)) {
        return yield* Effect.fail(
          new ProviderError({
            message: "Maestro provider does not support credential-based UTxO queries. Pass a full Address instead.",
            cause: "Unsupported operation"
          })
        )
      }
      const addressStr = CoreAddress.toBech32(addressOrCredential)

      // Get all pages of UTxOs
      const allUtxos = yield* getUtxosWithPagination(`${baseUrl}/addresses/${addressStr}/utxos`, apiKey)

      return allUtxos.map(Maestro.transformUTxO)
    })

/**
 * Get UTxOs by unit with cursor pagination
 */
export const getUtxosWithUnit =
  (baseUrl: string, apiKey: string) =>
  (addressOrCredential: CoreAddress.Address | Credential.Credential, unit: string) =>
    Effect.gen(function* () {
      // Use address endpoint and filter by unit client-side,
      // because /assets/{unit}/utxos returns a simplified response without full UTxO details
      if (!(addressOrCredential instanceof CoreAddress.Address)) {
        return yield* Effect.fail(
          new ProviderError({
            message: "Maestro provider does not support credential-based UTxO queries. Pass a full Address instead.",
            cause: "Unsupported operation"
          })
        )
      }
      const addressStr = CoreAddress.toBech32(addressOrCredential)

      const allUtxos = yield* getUtxosWithPagination(`${baseUrl}/addresses/${addressStr}/utxos`, apiKey)

      // Filter raw Maestro UTxOs for unit match before transforming
      const matching = allUtxos.filter((u) => u.assets.some((a) => a.unit === unit))
      return matching.map(Maestro.transformUTxO)
    })

/**
 * Get UTxOs by output references
 */
export const getUtxosByOutRef =
  (baseUrl: string, apiKey: string) => (inputs: ReadonlyArray<TransactionInput.TransactionInput>) =>
    Effect.gen(function* () {
      // Group by tx_hash to minimize API calls
      const byTxHash = new Map<string, Array<number>>()
      for (const input of inputs) {
        const hash = TransactionHash.toHex(input.transactionId)
        const indices = byTxHash.get(hash) ?? []
        indices.push(Number(input.index))
        byTxHash.set(hash, indices)
      }

      const results: Array<Schema.Schema.Type<typeof Maestro.MaestroUTxO>> = []

      for (const [txHash, indices] of byTxHash) {
        const tx = yield* HttpUtils.get(
          `${baseUrl}/transactions/${txHash}`,
          Maestro.MaestroTimestampedResponse(Maestro.MaestroTransaction),
          createHeadersWithAmounts(apiKey)
        ).pipe(Effect.timeout(TIMEOUT), Effect.catchAll(wrapError("get UTxOs by outRef")))

        for (const idx of indices) {
          const output = tx.data.outputs.find((o) => o.index === idx)
          if (output) results.push(output)
        }
      }

      return results.map(Maestro.transformUTxO)
    })

// ============================================================================
// Delegation
// ============================================================================

/**
 * Get delegation info for a credential
 */
export const getDelegation = (baseUrl: string, apiKey: string) => (rewardAddress: string) =>
  HttpUtils.get(
    `${baseUrl}/accounts/${rewardAddress}`,
    Maestro.MaestroTimestampedResponse(Maestro.MaestroDelegation),
    createHeaders(apiKey)
  ).pipe(
    Effect.map((response) => Maestro.transformDelegation(response.data)),
    Effect.timeout(TIMEOUT),
    Effect.catchAll(wrapError("get delegation"))
  )

// ============================================================================
// Transaction Submission
// ============================================================================

/**
 * Submit transaction to Maestro
 */
export const submitTx = (baseUrl: string, apiKey: string, turboSubmit?: boolean) => (tx: Transaction.Transaction) =>
  Effect.gen(function* () {
    const endpoint = turboSubmit ? "/turbo/submit" : "/submit"

    // Convert Transaction to CBOR bytes for submission
    const txBytes = Transaction.toCBORBytes(tx)

    const response = yield* HttpUtils.postUint8Array(
      `${baseUrl}${endpoint}`,
      txBytes,
      Schema.String, // Expecting transaction hash as response
      createHeaders(apiKey)
    ).pipe(Effect.timeout(TIMEOUT), Effect.catchAll(wrapError("submit transaction")))

    return Schema.decodeSync(TransactionHash.FromHex)(response)
  })

// ============================================================================
// Transaction Evaluation
// ============================================================================

/**
 * Evaluate transaction with Maestro
 */
export const evaluateTx =
  (baseUrl: string, apiKey: string) => (tx: Transaction.Transaction, additionalUTxOs?: Array<CoreUTxO.UTxO>) =>
    Effect.gen(function* () {
      const txCborHex = Transaction.toCBORHex(tx)
      const additionalUtxos = additionalUTxOs?.map((utxo) => {
        const txOut = new TxOut.TransactionOutput({
          address: utxo.address,
          assets: utxo.assets,
          datumOption: utxo.datumOption,
          scriptRef: utxo.scriptRef
            ? new ScriptRef.ScriptRef({ bytes: Bytes.fromHex(Script.toCBORHex(utxo.scriptRef)) })
            : undefined
        })

        return {
          tx_hash: TransactionHash.toHex(utxo.transactionId),
          index: Number(utxo.index),
          txout_cbor: TxOut.toCBORHex(txOut)
        }
      })

      const requestBody = {
        cbor: txCborHex,
        ...(additionalUtxos && additionalUtxos.length > 0 ? { additional_utxos: additionalUtxos } : {})
      }

      const response = yield* HttpUtils.postJson(
        `${baseUrl}/transactions/evaluate`,
        requestBody,
        Maestro.MaestroEvalResult,
        createHeaders(apiKey)
      ).pipe(Effect.timeout(TIMEOUT), Effect.catchAll(wrapError("evaluate transaction")))

      return Maestro.transformEvaluationResult(response)
    })

/**
 * Get single UTxO by unit (asset policy + name)
 */
export const getUtxoByUnit = (baseUrl: string, apiKey: string) => (unit: string) =>
  Effect.gen(function* () {
    // Get the first UTxO reference from the asset endpoint (simplified response)
    const refs = yield* HttpUtils.get(
      `${baseUrl}/assets/${unit}/utxos?count=1`,
      Maestro.MaestroPaginatedResponse(Maestro.MaestroAssetUTxORef),
      createHeadersWithAmounts(apiKey)
    ).pipe(Effect.timeout(TIMEOUT), Effect.catchAll(wrapError("get UTxO by unit")))

    if (refs.data.length === 0) {
      return yield* Effect.fail(
        new ProviderError({
          cause: new Error("No UTxO found for unit"),
          message: "UTxO not found"
        })
      )
    }

    const ref = refs.data[0]

    // Resolve the full UTxO via the address endpoint and filter by tx_hash + index
    const allUtxos = yield* getUtxosWithPagination(`${baseUrl}/addresses/${ref.address}/utxos`, apiKey)

    const match = allUtxos.find((u) => u.tx_hash === ref.tx_hash && u.index === ref.index)

    if (!match) {
      return yield* Effect.fail(
        new ProviderError({
          cause: new Error("No UTxO found for unit"),
          message: "UTxO not found"
        })
      )
    }

    return Maestro.transformUTxO(match)
  })

/**
 * Get datum by datum hash
 */
export const getDatum = (baseUrl: string, apiKey: string) => (datumHash: DatumHash.DatumHash) =>
  Effect.gen(function* () {
    const datumHashHex = Bytes.toHex(datumHash.hash)
    const response = yield* HttpUtils.get(
      `${baseUrl}/datums/${datumHashHex}`,
      Maestro.MaestroTimestampedResponse(
        Schema.Struct({
          bytes: Schema.String
        })
      ),
      {
        "api-key": apiKey,
        accept: "application/json"
      }
    ).pipe(Effect.timeout(TIMEOUT), Effect.catchAll(wrapError("get datum")))

    return Schema.decodeSync(PlutusData.FromCBORHex())(response.data.bytes)
  })

/**
 * Wait for transaction confirmation
 */
export const awaitTx =
  (baseUrl: string, apiKey: string) =>
  (txHash: TransactionHash.TransactionHash, checkInterval?: number, timeout: number = 160_000) => {
    const txHashHex = TransactionHash.toHex(txHash)
    return Effect.gen(function* () {
      const interval = checkInterval || 5000 // Default 5 seconds

      while (true) {
        // Check if transaction exists and is confirmed
        const result = yield* HttpUtils.get(
          `${baseUrl}/transactions/${txHashHex}`,
          Maestro.MaestroTimestampedResponse(
            Schema.Struct({
              tx_hash: Schema.String,
              block_hash: Schema.String
            })
          ),
          createHeaders(apiKey)
        ).pipe(Effect.timeout(TIMEOUT), Effect.catchAll(wrapError("awaitTx")), Effect.either)

        // If successful and we have a block_hash, transaction is confirmed
        if (result._tag === "Right" && result.right.data.block_hash) {
          return true
        }

        // Wait before checking again
        yield* Effect.sleep(`${interval} millis`)
      }
    }).pipe(Effect.timeout(timeout), Effect.catchAllCause(
      (cause) => Effect.fail(new ProviderError({ cause, message: "Maestro awaitTx failed" }))
    ))
  }

// ============================================================================
// Pagination Helpers
// ============================================================================

/**
 * Get all pages of UTxOs using cursor pagination
 */
const getUtxosWithPagination = (url: string, apiKey: string, maxCount?: number) =>
  Effect.gen(function* () {
    let allUtxos: Array<Schema.Schema.Type<typeof Maestro.MaestroUTxO>> = []
    let cursor: string | undefined = undefined

    while (true) {
      // Build URL with cursor if available
      const requestUrl: string = cursor ? `${url}?cursor=${cursor}` : url

      const page = yield* HttpUtils.get(
        requestUrl,
        Maestro.MaestroPaginatedResponse(Maestro.MaestroUTxO),
        createHeadersWithAmounts(apiKey) // Use amounts-as-strings for better precision
      ).pipe(Effect.timeout(TIMEOUT), Effect.catchAll(wrapError("get paginated UTxOs")))

      allUtxos = [...allUtxos, ...page.data]

      // Check if we should stop pagination
      if (!page.next_cursor || (maxCount && allUtxos.length >= maxCount)) {
        break
      }

      cursor = page.next_cursor
    }

    // Trim to exact count if specified
    return maxCount ? allUtxos.slice(0, maxCount) : allUtxos
  })
