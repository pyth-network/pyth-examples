/**
 * @fileoverview Maestro API schemas and transformation utilities
 * Internal module for Maestro provider implementation
 */

import { Schema } from "effect"

import * as CoreAddress from "../../../Address.js"
import * as CoreAssets from "../../../Assets/index.js"
import * as Bytes from "../../../Bytes.js"
import * as PlutusData from "../../../Data.js"
import * as DatumHash from "../../../DatumHash.js"
import type { DatumOption } from "../../../DatumOption.js"
import * as InlineDatum from "../../../InlineDatum.js"
import * as NativeScripts from "../../../NativeScripts.js"
import * as PlutusV1 from "../../../PlutusV1.js"
import * as PlutusV2 from "../../../PlutusV2.js"
import * as PlutusV3 from "../../../PlutusV3.js"
import * as PoolKeyHash from "../../../PoolKeyHash.js"
import * as Redeemer from "../../../Redeemer.js"
import type { Script } from "../../../Script.js"
import * as TransactionHash from "../../../TransactionHash.js"
import * as CoreUTxO from "../../../UTxO.js"
import type { EvalRedeemer } from "../../EvalRedeemer.js"
import type * as Provider from "../Provider.js"

// ============================================================================
// Maestro API Response Schemas
// ============================================================================

/**
 * Accept both string and number for fields Maestro may return as either type
 */
const StringOrNumber = Schema.Union(Schema.String, Schema.Number)

/**
 * Maestro protocol parameters response schema
 */
export const MaestroProtocolParameters = Schema.Struct({
  min_fee_coefficient: StringOrNumber,
  min_fee_constant: Schema.Struct({
    ada: Schema.Struct({
      lovelace: StringOrNumber
    })
  }),
  max_transaction_size: Schema.Struct({
    bytes: StringOrNumber
  }),
  max_value_size: Schema.Struct({
    bytes: StringOrNumber
  }),
  stake_credential_deposit: Schema.Struct({
    ada: Schema.Struct({
      lovelace: StringOrNumber
    })
  }),
  stake_pool_deposit: Schema.Struct({
    ada: Schema.Struct({
      lovelace: StringOrNumber
    })
  }),
  delegate_representative_deposit: Schema.Struct({
    ada: Schema.Struct({
      lovelace: StringOrNumber
    })
  }),
  governance_action_deposit: Schema.Struct({
    ada: Schema.Struct({
      lovelace: StringOrNumber
    })
  }),
  script_execution_prices: Schema.Struct({
    memory: Schema.String, // rational format "numerator/denominator"
    cpu: Schema.String // rational format "numerator/denominator"
  }),
  max_execution_units_per_transaction: Schema.Struct({
    memory: StringOrNumber,
    cpu: StringOrNumber
  }),
  min_utxo_deposit_coefficient: StringOrNumber,
  collateral_percentage: StringOrNumber,
  max_collateral_inputs: StringOrNumber,
  min_fee_reference_scripts: Schema.Struct({
    base: StringOrNumber
  }),
  plutus_cost_models: Schema.Struct({
    plutus_v1: Schema.Array(Schema.Number),
    plutus_v2: Schema.Array(Schema.Number),
    plutus_v3: Schema.Array(Schema.Number)
  })
})

/**
 * Maestro asset schema
 */
export const MaestroAsset = Schema.Struct({
  unit: Schema.String,
  amount: Schema.String
})

/**
 * Maestro datum option schema
 */
export const MaestroDatumOption = Schema.Struct({
  type: Schema.Literal("hash", "inline"),
  hash: Schema.String,
  bytes: Schema.NullOr(Schema.String),
  json: Schema.NullOr(Schema.Unknown)
})

/**
 * Maestro script schema
 */
export const MaestroScript = Schema.Struct({
  hash: Schema.String,
  type: Schema.Literal("native", "plutusv1", "plutusv2", "plutusv3"),
  bytes: Schema.NullOr(Schema.String),
  json: Schema.NullOr(Schema.Unknown)
})

/**
 * Maestro asset UTxO reference schema (simplified response from /assets/{unit}/utxos)
 */
export const MaestroAssetUTxORef = Schema.Struct({
  tx_hash: Schema.String,
  index: Schema.Number,
  address: Schema.String,
  amount: Schema.String
})

/**
 * Maestro UTxO schema
 */
export const MaestroUTxO = Schema.Struct({
  tx_hash: Schema.String,
  index: Schema.Number,
  assets: Schema.Array(MaestroAsset),
  address: Schema.String,
  datum: Schema.NullOr(MaestroDatumOption),
  reference_script: Schema.NullOr(MaestroScript)
})

/**
 * Maestro delegation/account response schema
 */
export const MaestroDelegation = Schema.Struct({
  delegated_pool: Schema.NullOr(Schema.String),
  rewards_available: StringOrNumber
})

/**
 * Maestro transaction response schema (subset needed for output resolution)
 */
export const MaestroTransaction = Schema.Struct({
  outputs: Schema.Array(MaestroUTxO)
})

/**
 * Maestro timestamped response wrapper
 */
export const MaestroTimestampedResponse = <A>(dataSchema: Schema.Schema<A>) =>
  Schema.Struct({
    data: dataSchema,
    last_updated: Schema.Struct({
      timestamp: Schema.String,
      block_slot: Schema.Number,
      block_hash: Schema.String
    })
  })

/**
 * Maestro paginated response wrapper
 */
export const MaestroPaginatedResponse = <A>(dataSchema: Schema.Schema<A>) =>
  Schema.Struct({
    data: Schema.Array(dataSchema),
    next_cursor: Schema.NullOr(Schema.String),
    last_updated: Schema.Struct({
      timestamp: Schema.String,
      block_slot: Schema.Number,
      block_hash: Schema.String
    })
  })

export const MaestroEvaluateRedeemer = Schema.Struct({
  redeemer_tag: Schema.Literal("spend", "mint", "cert", "wdrl", "vote", "propose"),
  redeemer_index: Schema.Number,
  ex_units: Schema.Struct({
    mem: StringOrNumber,
    steps: StringOrNumber
  })
})

export const MaestroEvalResult = Schema.Array(MaestroEvaluateRedeemer)

// ============================================================================
// Transformation Utilities
// ============================================================================

export const parseDecimalFromRational = (rationalStr: string): number => {
  const forwardSlashIndex = rationalStr.indexOf("/")
  if (forwardSlashIndex === -1) {
    throw new Error(`Invalid rational string format: ${rationalStr}`)
  }
  const numerator = parseInt(rationalStr.slice(0, forwardSlashIndex))
  const denominator = parseInt(rationalStr.slice(forwardSlashIndex + 1))

  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
    throw new Error(`Invalid rational string format: ${rationalStr}`)
  }

  return numerator / denominator
}

const toInt = (v: string | number): number => (typeof v === "number" ? v : parseInt(v))
const toBigInt = (v: string | number): bigint => BigInt(v)

/**
 * Transform Maestro protocol parameters to Evolution SDK format
 */
export const transformProtocolParameters = (
  maestroParams: Schema.Schema.Type<typeof MaestroProtocolParameters>
): Provider.ProtocolParameters => {
  return {
    minFeeA: toInt(maestroParams.min_fee_coefficient),
    minFeeB: toInt(maestroParams.min_fee_constant.ada.lovelace),
    maxTxSize: toInt(maestroParams.max_transaction_size.bytes),
    maxValSize: toInt(maestroParams.max_value_size.bytes),
    keyDeposit: toBigInt(maestroParams.stake_credential_deposit.ada.lovelace),
    poolDeposit: toBigInt(maestroParams.stake_pool_deposit.ada.lovelace),
    drepDeposit: toBigInt(maestroParams.delegate_representative_deposit.ada.lovelace),
    govActionDeposit: toBigInt(maestroParams.governance_action_deposit.ada.lovelace),
    priceMem: parseDecimalFromRational(maestroParams.script_execution_prices.memory),
    priceStep: parseDecimalFromRational(maestroParams.script_execution_prices.cpu),
    maxTxExMem: toBigInt(maestroParams.max_execution_units_per_transaction.memory),
    maxTxExSteps: toBigInt(maestroParams.max_execution_units_per_transaction.cpu),
    coinsPerUtxoByte: toBigInt(maestroParams.min_utxo_deposit_coefficient),
    collateralPercentage: toInt(maestroParams.collateral_percentage),
    maxCollateralInputs: toInt(maestroParams.max_collateral_inputs),
    minFeeRefScriptCostPerByte: toInt(maestroParams.min_fee_reference_scripts.base),
    costModels: {
      PlutusV1: Object.fromEntries(
        maestroParams.plutus_cost_models.plutus_v1.map((value: number, index: number) => [index.toString(), value])
      ),
      PlutusV2: Object.fromEntries(
        maestroParams.plutus_cost_models.plutus_v2.map((value: number, index: number) => [index.toString(), value])
      ),
      PlutusV3: Object.fromEntries(
        maestroParams.plutus_cost_models.plutus_v3.map((value: number, index: number) => [index.toString(), value])
      )
    }
  }
}

/**
 * Transform Maestro datum option to Evolution SDK format
 */
export const transformDatumOption = (
  maestroDatum?: Schema.Schema.Type<typeof MaestroDatumOption> | null
): DatumOption | undefined => {
  if (!maestroDatum) return undefined
  if (maestroDatum.type === "inline" && maestroDatum.bytes) {
    return new InlineDatum.InlineDatum({ data: PlutusData.fromCBORHex(maestroDatum.bytes) })
  }
  return DatumHash.fromHex(maestroDatum.hash)
}

/**
 * Transform Maestro assets array to Core Assets format
 */
export const transformAssets = (
  maestroAssets: ReadonlyArray<Schema.Schema.Type<typeof MaestroAsset>>
): CoreAssets.Assets => {
  let lovelace = 0n
  const multiAssetEntries: Array<[string, bigint]> = []

  for (const asset of maestroAssets) {
    if (asset.unit === "lovelace") {
      lovelace = BigInt(asset.amount)
    } else {
      multiAssetEntries.push([asset.unit, BigInt(asset.amount)])
    }
  }

  // Build Core Assets starting with lovelace
  let assets = CoreAssets.fromLovelace(lovelace)

  // Add multi-assets using hex strings
  for (const [unit, qty] of multiAssetEntries) {
    // Parse unit - policyId is first 56 chars, assetName is remainder
    const policyIdHex = unit.slice(0, 56)
    const assetNameHex = unit.slice(56)
    assets = CoreAssets.addByHex(assets, policyIdHex, assetNameHex, qty)
  }

  return assets
}

/**
 * Transform Maestro script reference to Evolution SDK format
 */
export const transformScriptRef = (
  maestroScript?: Schema.Schema.Type<typeof MaestroScript> | null
): Script | undefined => {
  if (!maestroScript?.bytes) return undefined
  const scriptBytes = Bytes.fromHex(maestroScript.bytes)
  switch (maestroScript.type) {
    case "plutusv1":
      return new PlutusV1.PlutusV1({ bytes: scriptBytes })
    case "plutusv2":
      return new PlutusV2.PlutusV2({ bytes: scriptBytes })
    case "plutusv3":
      return new PlutusV3.PlutusV3({ bytes: scriptBytes })
    case "native":
      return NativeScripts.fromCBORHex(maestroScript.bytes)
  }
}

/**
 * Transform Maestro UTxO to Core UTxO format
 */
export const transformUTxO = (maestroUtxo: Schema.Schema.Type<typeof MaestroUTxO>): CoreUTxO.UTxO => {
  const assets = transformAssets(maestroUtxo.assets)
  const address = CoreAddress.fromBech32(maestroUtxo.address)
  const transactionId = TransactionHash.fromHex(maestroUtxo.tx_hash)
  const datumOption = transformDatumOption(maestroUtxo.datum)
  const scriptRef = transformScriptRef(maestroUtxo.reference_script)

  return new CoreUTxO.UTxO({
    transactionId,
    index: BigInt(maestroUtxo.index),
    address,
    assets,
    ...(datumOption && { datumOption }),
    ...(scriptRef && { scriptRef })
  })
}

/**
 * Transform Maestro delegation response to Evolution SDK format
 */
export const transformDelegation = (
  maestroDelegation: Schema.Schema.Type<typeof MaestroDelegation>
): Provider.Delegation => {
  return {
    poolId: maestroDelegation.delegated_pool
      ? PoolKeyHash.fromBech32(maestroDelegation.delegated_pool)
      : null,
    rewards: BigInt(maestroDelegation.rewards_available)
  }
}

/**
 * Transform Maestro evaluation result to Evolution SDK format
 */
export const transformEvaluationResult = (
  maestroResult: Schema.Schema.Type<typeof MaestroEvalResult>
): Array<EvalRedeemer> => {
  return maestroResult.map((redeemer) => ({
    redeemer_tag: (redeemer.redeemer_tag === "wdrl" ? "reward" : redeemer.redeemer_tag) as Redeemer.RedeemerTag,
    redeemer_index: redeemer.redeemer_index,
    ex_units: new Redeemer.ExUnits({
      mem: BigInt(redeemer.ex_units.mem),
      steps: BigInt(redeemer.ex_units.steps)
    })
  }))
}
