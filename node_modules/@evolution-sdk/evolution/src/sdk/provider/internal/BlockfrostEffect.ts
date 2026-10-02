/**
 * @fileoverview Effect-based Blockfrost provider functions
 * Internal module implementing all provider operations using Effect pattern
 */

import { HttpClientError } from "@effect/platform"
import { Effect, Schedule, Schema } from "effect"

import * as CoreAddress from "../../../Address.js"
import * as AssetName from "../../../AssetName.js"
import * as Bytes from "../../../Bytes.js"
import type * as Credential from "../../../Credential.js"
import * as PlutusData from "../../../Data.js"
import * as DatumHash from "../../../DatumHash.js"
import type * as DatumOption from "../../../DatumOption.js"
import * as InlineDatum from "../../../InlineDatum.js"
import * as NativeScripts from "../../../NativeScripts.js"
import * as PlutusV1 from "../../../PlutusV1.js"
import * as PlutusV2 from "../../../PlutusV2.js"
import * as PlutusV3 from "../../../PlutusV3.js"
import type * as RewardAddress from "../../../RewardAddress.js"
import type * as Script from "../../../Script.js"
import * as Transaction from "../../../Transaction.js"
import * as TransactionHash from "../../../TransactionHash.js"
import type * as TransactionInput from "../../../TransactionInput.js"
import * as CoreUTxO from "../../../UTxO.js"
import type * as Provider from "../Provider.js"
import { ProviderError } from "../Provider.js"
import * as Blockfrost from "./Blockfrost.js"
import * as HttpUtils from "./HttpUtils.js"

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Apply rate limiting to an Effect by delaying execution
 */
const withRateLimit = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.delay(effect, "100 millis")

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create Blockfrost API headers with project ID
 */
const createHeaders = (projectId?: string) => ({
  ...(projectId ? { project_id: projectId } : {}),
  "Content-Type": "application/json"
})

/**
 * Wrap errors into ProviderError
 */
const wrapError = (operation: string) => (cause: unknown) =>
  Effect.fail(
    new ProviderError({
      message: `Blockfrost ${operation} failed`,
      cause
    })
  )

/**
 * Check if an error is a 404 Not Found response
 */
const is404Error = (error: unknown): boolean => {
  if (error instanceof HttpClientError.ResponseError) {
    return error.response.status === 404
  }
  return false
}

/**
 * Convert address or credential to appropriate Blockfrost endpoint path
 */
const getAddressPath = (addressOrCredential: CoreAddress.Address | Credential.Credential): string => {
  // For Core Address, convert to bech32 string
  if (addressOrCredential instanceof CoreAddress.Address) {
    return CoreAddress.toBech32(addressOrCredential)
  }
  // For Credential, convert to string representation
  return addressOrCredential.toString()
}

const toBlockfrostValue = (
  assets: CoreUTxO.UTxO["assets"]
): Record<string, unknown> => {
  const value: Record<string, unknown> = {
    coins: Number(assets.lovelace)
  }

  if (assets.multiAsset) {
    for (const [policyId, assetMap] of assets.multiAsset.map.entries()) {
      const policyIdHex = Bytes.toHex(policyId.hash)
      const assetRecord: Record<string, number> = {}

      for (const [assetName, quantity] of assetMap.entries()) {
        assetRecord[AssetName.toHex(assetName)] = Number(quantity)
      }

      if (Object.keys(assetRecord).length > 0) {
        value[policyIdHex] = assetRecord
      }
    }
  }

  return value
}

const toBlockfrostDatum = (
  datumOption: DatumOption.DatumOption | undefined
): { datumHash?: string; datum?: string } => {
  if (!datumOption) {
    return {}
  }

  if (datumOption._tag === "DatumHash") {
    return { datumHash: Bytes.toHex(datumOption.hash) }
  }

  return { datum: PlutusData.toCBORHex(datumOption.data) }
}

const toBlockfrostScript = (
  script: Script.Script | undefined
):
  | { native: ReturnType<typeof NativeScripts.toJSON> }
  | { "plutus:v1": string }
  | { "plutus:v2": string }
  | { "plutus:v3": string }
  | undefined => {
  if (!script) {
    return undefined
  }

  switch (script._tag) {
    case "NativeScript":
      return { native: NativeScripts.toJSON(script.script) }
    case "PlutusV1":
      return { "plutus:v1": Bytes.toHex(script.bytes) }
    case "PlutusV2":
      return { "plutus:v2": Bytes.toHex(script.bytes) }
    case "PlutusV3":
      return { "plutus:v3": Bytes.toHex(script.bytes) }
  }
}

const toBlockfrostAdditionalUtxoSet = (additionalUTxOs: Array<CoreUTxO.UTxO>) =>
  additionalUTxOs.map((utxo) => {
    const txOut: Record<string, unknown> = {
      address: CoreAddress.toBech32(utxo.address),
      value: toBlockfrostValue(utxo.assets),
      ...toBlockfrostDatum(utxo.datumOption)
    }

    const script = toBlockfrostScript(utxo.scriptRef)
    if (script) {
      txOut.script = script
    }

    return [
      {
        txId: TransactionHash.toHex(utxo.transactionId),
        index: Number(utxo.index)
      },
      txOut
    ]
  })

/**
 * Blockfrost script info response schema
 */
const BlockfrostScriptInfo = Schema.Struct({
  script_hash: Schema.String,
  type: Schema.String,
  serialised_size: Schema.optional(Schema.Number)
})

/**
 * Blockfrost script CBOR response schema
 */
const BlockfrostScriptCbor = Schema.Struct({
  cbor: Schema.String
})

/**
 * Fetch script by hash and return as Script type
 */
const getScriptByHash =
  (baseUrl: string, projectId?: string) =>
  (scriptHash: string): Effect.Effect<Script.Script, ProviderError> => {
    // First get script info to determine type
    return withRateLimit(
      HttpUtils.get(`${baseUrl}/scripts/${scriptHash}`, BlockfrostScriptInfo, createHeaders(projectId))
    ).pipe(
      Effect.catchAll(wrapError("getScriptByHash")),
      Effect.flatMap((info) => {
        // Fetch CBOR for all script types (Blockfrost serves CBOR for native/timelock too)
        return withRateLimit(
          HttpUtils.get(`${baseUrl}/scripts/${scriptHash}/cbor`, BlockfrostScriptCbor, createHeaders(projectId))
        ).pipe(
          Effect.catchAll(wrapError("getScriptByHash")),
          Effect.map((cbor) => {
            const scriptBytes = Bytes.fromHex(cbor.cbor)
            switch (info.type) {
              case "timelock":
              case "native":
                return NativeScripts.fromCBORHex(cbor.cbor)
              case "plutusV1":
                return new PlutusV1.PlutusV1({ bytes: scriptBytes })
              case "plutusV2":
                return new PlutusV2.PlutusV2({ bytes: scriptBytes })
              case "plutusV3":
                return new PlutusV3.PlutusV3({ bytes: scriptBytes })
              default:
                throw new Error(`Unknown script type: ${info.type}`)
            }
          })
        )
      })
    )
  }

/**
 * Blockfrost datum CBOR response schema
 */
const BlockfrostDatumCbor = Schema.Struct({
  cbor: Schema.String
})

/**
 * Fetch datum by hash and return as DatumOption.
 * Since we've resolved the actual datum data, we return InlineDatum.
 */
const getDatumByHash =
  (baseUrl: string, projectId?: string) =>
  (datumHash: string): Effect.Effect<DatumOption.DatumOption, ProviderError> => {
    return withRateLimit(
      HttpUtils.get(`${baseUrl}/scripts/datum/${datumHash}/cbor`, BlockfrostDatumCbor, createHeaders(projectId))
    ).pipe(
      Effect.map((datum) => {
        const data = PlutusData.fromCBORHex(datum.cbor)
        return new InlineDatum.InlineDatum({ data })
      }),
      Effect.catchAll(wrapError("getDatumByHash"))
    )
  }

// ============================================================================
// Blockfrost Effect Functions (Curry Pattern)
// ============================================================================

/**
 * Get protocol parameters from Blockfrost API
 * Returns: (baseUrl, projectId?) => Effect<ProtocolParameters, ProviderError>
 */
export const getProtocolParameters = (baseUrl: string, projectId?: string) =>
  withRateLimit(
    HttpUtils.get(
      `${baseUrl}/epochs/latest/parameters`,
      Blockfrost.BlockfrostProtocolParameters,
      createHeaders(projectId)
    ).pipe(Effect.map(Blockfrost.transformProtocolParameters), Effect.catchAll(wrapError("getProtocolParameters")))
  )

/**
 * Get UTxOs for an address or credential with pagination support
 * Fetches reference scripts and resolves datum hashes for complete UTxO data
 * Returns: (baseUrl, projectId?) => (addressOrCredential) => Effect<UTxO[], ProviderError>
 */
export const getUtxos =
  (baseUrl: string, projectId?: string) => (addressOrCredential: CoreAddress.Address | Credential.Credential) => {
    const addressPath = getAddressPath(addressOrCredential)
    const fetchScript = getScriptByHash(baseUrl, projectId)
    const fetchDatum = getDatumByHash(baseUrl, projectId)

    // Fetch all pages of UTxOs
    const fetchPage = (page: number): Effect.Effect<ReadonlyArray<Blockfrost.BlockfrostUTxO>, unknown> =>
      withRateLimit(
        HttpUtils.get(
          `${baseUrl}/addresses/${addressPath}/utxos?page=${page}&count=100`,
          Schema.Array(Blockfrost.BlockfrostUTxO),
          createHeaders(projectId)
        )
      )

    const fetchAllPages = Effect.gen(function* () {
      const allUtxos: Array<Blockfrost.BlockfrostUTxO> = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const pageResult = yield* fetchPage(page).pipe(
          // Handle 404 as empty array (no UTxOs at address)
          Effect.catchIf(is404Error, () => Effect.succeed([] as ReadonlyArray<Blockfrost.BlockfrostUTxO>))
        )

        allUtxos.push(...pageResult)

        // If we got less than 100 results, we've reached the end
        if (pageResult.length < 100) {
          hasMore = false
        } else {
          page++
        }
      }

      return allUtxos
    })

    // Transform UTxOs with full script and datum resolution
    const transformWithResolution = (utxo: Blockfrost.BlockfrostUTxO) => {
      const transactionId = TransactionHash.fromHex(utxo.tx_hash)
      const address = CoreAddress.fromBech32(utxo.address)

      const scriptEffect = utxo.reference_script_hash
        ? fetchScript(utxo.reference_script_hash).pipe(
            Effect.map((s) => s as Script.Script | undefined),
            Effect.catchAll(() => Effect.succeed(undefined))
          )
        : Effect.succeed(undefined)

      const dataHash = utxo.data_hash
      const datumEffect = utxo.inline_datum
        ? Effect.succeed(
            new InlineDatum.InlineDatum({
              data: PlutusData.fromCBORHex(utxo.inline_datum)
            })
          )
        : dataHash
          ? fetchDatum(dataHash).pipe(Effect.catchAll(() => Effect.succeed(DatumHash.fromHex(dataHash))))
          : Effect.succeed(undefined)

      return Effect.all([scriptEffect, datumEffect]).pipe(
        Effect.map(([scriptRef, datumOption]) => {
          const assets = Blockfrost.transformAmounts(utxo.amount)
          return new CoreUTxO.UTxO({
            transactionId,
            index: BigInt(utxo.output_index),
            address,
            assets,
            scriptRef,
            datumOption
          })
        })
      )
    }

    return fetchAllPages.pipe(
      Effect.flatMap((utxos) =>
        Effect.forEach(
          utxos.filter((u) => u.tx_hash !== ""),
          transformWithResolution,
          { concurrency: 10 }
        )
      ),
      Effect.catchAll(wrapError("getUtxos"))
    )
  }

/**
 * Get UTxOs with a specific unit (asset) with pagination support
 * Fetches reference scripts and resolves datum hashes for complete UTxO data
 * Returns: (baseUrl, projectId?) => (addressOrCredential, unit) => Effect<UTxO[], ProviderError>
 */
export const getUtxosWithUnit =
  (baseUrl: string, projectId?: string) =>
  (addressOrCredential: CoreAddress.Address | Credential.Credential, unit: string) => {
    const addressPath = getAddressPath(addressOrCredential)
    const fetchScript = getScriptByHash(baseUrl, projectId)
    const fetchDatum = getDatumByHash(baseUrl, projectId)

    // Fetch all pages of UTxOs
    const fetchPage = (page: number): Effect.Effect<ReadonlyArray<Blockfrost.BlockfrostUTxO>, unknown> =>
      withRateLimit(
        HttpUtils.get(
          `${baseUrl}/addresses/${addressPath}/utxos/${unit}?page=${page}&count=100`,
          Schema.Array(Blockfrost.BlockfrostUTxO),
          createHeaders(projectId)
        )
      )

    const fetchAllPages = Effect.gen(function* () {
      const allUtxos: Array<Blockfrost.BlockfrostUTxO> = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const pageResult = yield* fetchPage(page).pipe(
          // Handle 404 as empty array (no UTxOs with this unit at address)
          Effect.catchIf(is404Error, () => Effect.succeed([] as ReadonlyArray<Blockfrost.BlockfrostUTxO>))
        )

        allUtxos.push(...pageResult)

        // If we got less than 100 results, we've reached the end
        if (pageResult.length < 100) {
          hasMore = false
        } else {
          page++
        }
      }

      return allUtxos
    })

    // Transform UTxOs with full script and datum resolution
    const transformWithResolution = (utxo: Blockfrost.BlockfrostUTxO) => {
      const scriptEffect = utxo.reference_script_hash
        ? fetchScript(utxo.reference_script_hash).pipe(
            Effect.map((s) => s as Script.Script | undefined),
            Effect.catchAll(() => Effect.succeed(undefined))
          )
        : Effect.succeed(undefined)

      const dataHash = utxo.data_hash
      const datumEffect = utxo.inline_datum
        ? Effect.succeed(
            new InlineDatum.InlineDatum({
              data: PlutusData.fromCBORHex(utxo.inline_datum)
            })
          )
        : dataHash
          ? fetchDatum(dataHash).pipe(Effect.catchAll(() => Effect.succeed(DatumHash.fromHex(dataHash))))
          : Effect.succeed(undefined)

      return Effect.all([scriptEffect, datumEffect]).pipe(
        Effect.map(([scriptRef, datumOption]) => {
          const assets = Blockfrost.transformAmounts(utxo.amount)
          const address = CoreAddress.fromBech32(addressPath)
          const transactionId = TransactionHash.fromHex(utxo.tx_hash)

          return new CoreUTxO.UTxO({
            transactionId,
            index: BigInt(utxo.output_index),
            address,
            assets,
            scriptRef,
            datumOption
          })
        })
      )
    }

    return fetchAllPages.pipe(
      Effect.flatMap((utxos) =>
        Effect.forEach(
          utxos.filter((u) => u.tx_hash !== ""),
          transformWithResolution,
          { concurrency: 10 }
        )
      ),
      Effect.catchAll(wrapError("getUtxosWithUnit"))
    )
  }

/**
 * Get UTxO by unit (first occurrence)
 * Fetches reference script and resolves datum for complete UTxO data
 * Returns: (baseUrl, projectId?) => (unit) => Effect<UTxO, ProviderError>
 */
export const getUtxoByUnit = (baseUrl: string, projectId?: string) => (unit: string) => {
  const fetchScript = getScriptByHash(baseUrl, projectId)
  const fetchDatum = getDatumByHash(baseUrl, projectId)

  // First, get addresses holding this unit
  return withRateLimit(
    HttpUtils.get(
      `${baseUrl}/assets/${unit}/addresses`,
      Schema.Array(Blockfrost.BlockfrostAssetAddress),
      createHeaders(projectId)
    )
  ).pipe(
    Effect.flatMap((addresses) => {
      if (addresses.length === 0) {
        return Effect.fail(
          new ProviderError({
            message: `No address found holding unit ${unit}`,
            cause: "No UTxO found"
          })
        )
      }
      // Get UTxOs from the first address holding the unit
      const address = addresses[0].address
      return withRateLimit(
        HttpUtils.get(
          `${baseUrl}/addresses/${address}/utxos/${unit}`,
          Schema.Array(Blockfrost.BlockfrostUTxO),
          createHeaders(projectId)
        )
      ).pipe(
        Effect.flatMap((utxos) => {
          if (utxos.length === 0) {
            return Effect.fail(
              new ProviderError({
                message: `No UTxO found for unit ${unit}`,
                cause: "No UTxO found"
              })
            )
          }

          const utxo = utxos[0]

          // Fetch script and datum if present
          const scriptEffect = utxo.reference_script_hash
            ? fetchScript(utxo.reference_script_hash).pipe(
                Effect.map((s) => s as Script.Script | undefined),
                Effect.catchAll(() => Effect.succeed(undefined))
              )
            : Effect.succeed(undefined)

          const dataHash = utxo.data_hash
          const datumEffect = utxo.inline_datum
            ? Effect.succeed(
                new InlineDatum.InlineDatum({
                  data: PlutusData.fromCBORHex(utxo.inline_datum)
                })
              )
            : dataHash
              ? fetchDatum(dataHash).pipe(Effect.catchAll(() => Effect.succeed(DatumHash.fromHex(dataHash))))
              : Effect.succeed(undefined)

          return Effect.all([scriptEffect, datumEffect]).pipe(
            Effect.map(([scriptRef, datumOption]) => {
              const assets = Blockfrost.transformAmounts(utxo.amount)
              const coreAddress = CoreAddress.fromBech32(address)
              const transactionId = TransactionHash.fromHex(utxo.tx_hash)

              return new CoreUTxO.UTxO({
                transactionId,
                index: BigInt(utxo.output_index),
                address: coreAddress,
                assets,
                scriptRef,
                datumOption
              })
            })
          )
        })
      )
    }),
    Effect.catchAll(wrapError("getUtxoByUnit"))
  )
}

/**
 * Get UTxOs by transaction inputs (output references)
 * Returns: (baseUrl, projectId?) => (inputs) => Effect<UTxO[], ProviderError>
 */
export const getUtxosByOutRef =
  (baseUrl: string, projectId?: string) => (inputs: ReadonlyArray<TransactionInput.TransactionInput>) => {
    const fetchScript = getScriptByHash(baseUrl, projectId)
    const fetchDatum = getDatumByHash(baseUrl, projectId)

    // Blockfrost doesn't have a bulk endpoint, so we need to make individual calls
    const effects = inputs.map((input) =>
      withRateLimit(
        HttpUtils.get(
          `${baseUrl}/txs/${TransactionHash.toHex(input.transactionId)}/utxos`,
          Blockfrost.BlockfrostTxUtxos,
          createHeaders(projectId)
        )
      ).pipe(
        Effect.flatMap((txUtxos) => {
          const matchingOutputs = txUtxos.outputs.filter((output) => output.output_index === Number(input.index))

          // For each output, fetch script and datum if needed
          return Effect.forEach(
            matchingOutputs,
            (output) => {
              const scriptEffect = output.reference_script_hash
                ? fetchScript(output.reference_script_hash).pipe(
                    Effect.map((s) => s as Script.Script | undefined),
                    Effect.catchAll(() => Effect.succeed(undefined))
                  )
                : Effect.succeed(undefined)

              const dataHash = output.data_hash
              const datumEffect = output.inline_datum
                ? Effect.succeed(
                    new InlineDatum.InlineDatum({
                      data: PlutusData.fromCBORHex(output.inline_datum)
                    })
                  )
                : dataHash
                  ? fetchDatum(dataHash).pipe(Effect.catchAll(() => Effect.succeed(DatumHash.fromHex(dataHash))))
                  : Effect.succeed(undefined)

              return Effect.all([scriptEffect, datumEffect]).pipe(
                Effect.map(([scriptRef, datumOption]) => {
                  const assets = Blockfrost.transformAmounts(output.amount)
                  const address = CoreAddress.fromBech32(output.address)
                  const transactionId = TransactionHash.fromHex(txUtxos.hash)

                  return new CoreUTxO.UTxO({
                    transactionId,
                    index: BigInt(output.output_index),
                    address,
                    assets,
                    scriptRef,
                    datumOption
                  })
                })
              )
            },
            { concurrency: 10 }
          )
        }),
        Effect.catchAll(wrapError("getUtxosByOutRef"))
      )
    )

    return Effect.all(effects).pipe(Effect.map((arrays) => arrays.flat()))
  }

/**
 * Get delegation information for a reward address
 * Returns: (baseUrl, projectId?) => (rewardAddress) => Effect<Delegation, ProviderError>
 */
export const getDelegation = (baseUrl: string, projectId?: string) => (rewardAddress: RewardAddress.RewardAddress) => {
  // RewardAddress is a branded string, use it directly
  return withRateLimit(
    HttpUtils.get(`${baseUrl}/accounts/${rewardAddress}`, Blockfrost.BlockfrostDelegation, createHeaders(projectId))
  ).pipe(
    Effect.map(Blockfrost.transformDelegation),
    // Handle 404 - account not registered/never staked
    Effect.catchIf(is404Error, () => Effect.succeed({ poolId: null, rewards: 0n } as Provider.Delegation)),
    Effect.catchAll(wrapError("getDelegation"))
  )
}

/**
 * Get datum by hash
 * Returns: (baseUrl, projectId?) => (datumHash) => Effect<PlutusData, ProviderError>
 */
export const getDatum = (baseUrl: string, projectId?: string) => (datumHash: DatumHash.DatumHash) => {
  const datumHashHex = Bytes.toHex(datumHash.hash)
  return withRateLimit(
    HttpUtils.get(
      `${baseUrl}/scripts/datum/${datumHashHex}/cbor`,
      BlockfrostDatumCbor,
      createHeaders(projectId)
    ).pipe(
      Effect.flatMap((datum) => {
        // Parse CBOR hex to PlutusData
        return Effect.try({
          try: () => Schema.decodeSync(PlutusData.FromCBORHex())(datum.cbor),
          catch: (error) => new ProviderError({ message: "Failed to parse datum CBOR", cause: error })
        })
      }),
      Effect.catchAll(wrapError("getDatum"))
    )
  )
}

/**
 * Await transaction confirmation
 * Returns: (baseUrl, projectId?) => (txHash, checkInterval?) => Effect<boolean, ProviderError>
 */
export const awaitTx =
  (baseUrl: string, projectId?: string) =>
  (txHash: TransactionHash.TransactionHash, checkInterval: number = 5000, timeout: number = 300_000) => {
    const txHashHex = TransactionHash.toHex(txHash)
    const checkTx = withRateLimit(
      HttpUtils.get(
        `${baseUrl}/txs/${txHashHex}`,
        Schema.Struct({ hash: Schema.String }),
        createHeaders(projectId)
      ).pipe(
        Effect.map(() => true),
        Effect.catchAll(wrapError("awaitTx"))
      )
    )

    return Effect.retry(checkTx, Schedule.fixed(`${checkInterval} millis`)).pipe(
      Effect.timeout(timeout),
      Effect.catchAllCause(
        (cause) => Effect.fail(new ProviderError({ cause, message: "Blockfrost awaitTx failed" }))
      )
    )
  }

/**
 * Submit transaction
 * Returns: (baseUrl, projectId?) => (tx) => Effect<TransactionHash, ProviderError>
 */
export const submitTx = (baseUrl: string, projectId?: string) => (tx: Transaction.Transaction) => {
  // Convert Transaction to CBOR bytes for submission
  const cborBytes = Transaction.toCBORBytes(tx)

  // Create headers without Content-Type (will be set by postUint8Array)
  const headers = projectId ? { project_id: projectId } : undefined

  return withRateLimit(
    HttpUtils.postUint8Array(`${baseUrl}/tx/submit`, cborBytes, Blockfrost.BlockfrostSubmitResponse, headers).pipe(
      Effect.flatMap((txHashHex) => {
        // Parse transaction hash from hex string
        return Effect.try({
          try: () => Schema.decodeSync(TransactionHash.FromHex)(txHashHex),
          catch: (error) => new ProviderError({ message: "Failed to parse transaction hash", cause: error })
        })
      }),
      Effect.catchAll(wrapError("submitTx"))
    )
  )
}

/**
 * Evaluate transaction
 * Returns: (baseUrl, projectId?) => (tx, additionalUTxOs?) => Effect<EvalRedeemer[], ProviderError>
 */
export const evaluateTx =
  (baseUrl: string, projectId?: string) => (tx: Transaction.Transaction, additionalUTxOs?: Array<CoreUTxO.UTxO>) => {
    // Convert Transaction to CBOR hex for evaluation
    const txCborHex = Transaction.toCBORHex(tx)

    // Always use the /utils/txs/evaluate/utxos JSON endpoint as it's more reliable
    // The /utils/txs/evaluate CBOR endpoint has intermittent 500 errors
    const headers = {
      ...(projectId ? { project_id: projectId } : {}),
      "Content-Type": "application/json"
    }

    // Build additional UTxO set if provided
    const additionalUtxoSet =
      additionalUTxOs && additionalUTxOs.length > 0
        ? toBlockfrostAdditionalUtxoSet(additionalUTxOs)
        : []

    const payload = {
      cbor: txCborHex,
      additionalUtxoSet
    }

    return withRateLimit(
      HttpUtils.postJson(
        `${baseUrl}/utils/txs/evaluate/utxos`,
        payload,
        Blockfrost.JsonwspOgmiosEvaluationResponse,
        headers
      ).pipe(Effect.flatMap(Blockfrost.transformJsonwspOgmiosEvaluationResult), Effect.catchAll(wrapError("evaluateTx")))
    )
  }
