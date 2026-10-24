/**
 * @fileoverview Blockfrost API schemas and transformation utilities
 * Internal module for Blockfrost provider implementation
 */

import { Effect, Schema } from "effect"

import * as CoreAssets from "../../../Assets/index.js"
import * as PoolKeyHash from "../../../PoolKeyHash.js"
import * as Redeemer from "../../../Redeemer.js"
import type { EvalRedeemer } from "../../EvalRedeemer.js"
import type * as Provider from "../Provider.js"
import { ProviderError } from "../Provider.js"

// ============================================================================
// Blockfrost API Response Schemas
// ============================================================================

/**
 * Blockfrost protocol parameters response schema
 */
export const BlockfrostProtocolParameters = Schema.Struct({
  min_fee_a: Schema.Number,
  min_fee_b: Schema.Number,
  pool_deposit: Schema.String,
  key_deposit: Schema.String,
  min_utxo: Schema.String,
  max_tx_size: Schema.Number,
  max_val_size: Schema.optional(Schema.String),
  utxo_cost_per_word: Schema.optional(Schema.String),
  cost_models: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  price_mem: Schema.optional(Schema.Number),
  price_step: Schema.optional(Schema.Number),
  max_tx_ex_mem: Schema.optional(Schema.String),
  max_tx_ex_steps: Schema.optional(Schema.String),
  max_block_ex_mem: Schema.optional(Schema.String),
  max_block_ex_steps: Schema.optional(Schema.String),
  max_block_size: Schema.Number,
  collateral_percent: Schema.optional(Schema.Number),
  max_collateral_inputs: Schema.optional(Schema.Number),
  coins_per_utxo_size: Schema.optional(Schema.String),
  min_fee_ref_script_cost_per_byte: Schema.optional(Schema.Number),
  // Conway era governance parameters
  drep_deposit: Schema.optional(Schema.String),
  gov_action_deposit: Schema.optional(Schema.String)
})

export type BlockfrostProtocolParameters = Schema.Schema.Type<typeof BlockfrostProtocolParameters>

/**
 * Blockfrost UTxO amount schema (for multi-asset support)
 */
export const BlockfrostAmount = Schema.Struct({
  unit: Schema.String,
  quantity: Schema.String
})

export type BlockfrostAmount = Schema.Schema.Type<typeof BlockfrostAmount>

/**
 * Blockfrost UTxO response schema
 */
export const BlockfrostUTxO = Schema.Struct({
  address: Schema.String,
  tx_hash: Schema.String,
  tx_index: Schema.Number,
  output_index: Schema.Number,
  amount: Schema.Array(BlockfrostAmount),
  block: Schema.String,
  data_hash: Schema.NullOr(Schema.String),
  inline_datum: Schema.NullOr(Schema.String),
  reference_script_hash: Schema.NullOr(Schema.String)
})

export type BlockfrostUTxO = Schema.Schema.Type<typeof BlockfrostUTxO>

/**
 * Blockfrost delegation/account response schema
 * From /accounts/{stake_address} endpoint
 */
export const BlockfrostDelegation = Schema.Struct({
  stake_address: Schema.String,
  active: Schema.Boolean,
  active_epoch: Schema.NullOr(Schema.Number),
  pool_id: Schema.NullOr(Schema.String),
  controlled_amount: Schema.String,
  rewards_sum: Schema.String,
  withdrawals_sum: Schema.String,
  reserves_sum: Schema.String,
  treasury_sum: Schema.String,
  withdrawable_amount: Schema.String,
  drep_id: Schema.NullOr(Schema.String)
})

export type BlockfrostDelegation = Schema.Schema.Type<typeof BlockfrostDelegation>

/**
 * Blockfrost asset address response schema (from /assets/{unit}/addresses endpoint)
 */
export const BlockfrostAssetAddress = Schema.Struct({
  address: Schema.String,
  quantity: Schema.String
})

export type BlockfrostAssetAddress = Schema.Schema.Type<typeof BlockfrostAssetAddress>

/**
 * Blockfrost transaction UTxO output schema (from /txs/{hash}/utxos endpoint)
 * Different from regular UTxO - uses output_index instead of tx_index
 */
export const BlockfrostTxUtxoOutput = Schema.Struct({
  address: Schema.String,
  amount: Schema.Array(BlockfrostAmount),
  output_index: Schema.Number,
  data_hash: Schema.NullOr(Schema.String),
  inline_datum: Schema.NullOr(Schema.String),
  reference_script_hash: Schema.NullOr(Schema.String),
  collateral: Schema.Boolean,
  consumed_by_tx: Schema.NullOr(Schema.String)
})

export type BlockfrostTxUtxoOutput = Schema.Schema.Type<typeof BlockfrostTxUtxoOutput>

/**
 * Blockfrost transaction UTxOs response schema (from /txs/{hash}/utxos endpoint)
 */
export const BlockfrostTxUtxos = Schema.Struct({
  hash: Schema.String,
  inputs: Schema.Array(Schema.Unknown),
  outputs: Schema.Array(BlockfrostTxUtxoOutput)
})

export type BlockfrostTxUtxos = Schema.Schema.Type<typeof BlockfrostTxUtxos>

/**
 * Blockfrost transaction submit response schema
 */
export const BlockfrostSubmitResponse = Schema.String

export type BlockfrostSubmitResponse = Schema.Schema.Type<typeof BlockfrostSubmitResponse>

/**
 * Blockfrost datum response schema
 */
export const BlockfrostDatum = Schema.Struct({
  json_value: Schema.optional(Schema.Unknown),
  cbor: Schema.String
})

export type BlockfrostDatum = Schema.Schema.Type<typeof BlockfrostDatum>

/**
 * Schema for JSONWSP-wrapped Ogmios evaluation response
 * Used by /utils/txs/evaluate/utxos endpoint
 * Can contain either EvaluationResult (success) or EvaluationFailure (error)
 */
export const JsonwspOgmiosEvaluationResponse = Schema.Struct({
  type: Schema.optional(Schema.String),
  version: Schema.optional(Schema.String),
  servicename: Schema.optional(Schema.String),
  methodname: Schema.optional(Schema.String),
  result: Schema.optional(Schema.Struct({
    EvaluationResult: Schema.optional(
      Schema.Record({
        key: Schema.String, // "spend:0", "mint:1", etc.
        value: Schema.Struct({
          memory: Schema.Number,
          steps: Schema.Number
        })
      })
    ),
    EvaluationFailure: Schema.optional(Schema.Unknown)
  })),
  fault: Schema.optional(Schema.Struct({
    code: Schema.optional(Schema.String),
    string: Schema.optional(Schema.String)
  })),
  reflection: Schema.optional(Schema.Unknown)
})

export type JsonwspOgmiosEvaluationResponse = Schema.Schema.Type<typeof JsonwspOgmiosEvaluationResponse>

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transform Blockfrost protocol parameters to Evolution SDK format
 */
export const transformProtocolParameters = (
  blockfrostParams: BlockfrostProtocolParameters
): Provider.ProtocolParameters => {
  return {
    minFeeA: blockfrostParams.min_fee_a,
    minFeeB: blockfrostParams.min_fee_b,
    poolDeposit: BigInt(blockfrostParams.pool_deposit),
    keyDeposit: BigInt(blockfrostParams.key_deposit),
    maxTxSize: blockfrostParams.max_tx_size,
    maxValSize: blockfrostParams.max_val_size ? Number(blockfrostParams.max_val_size) : 0,
    priceMem: blockfrostParams.price_mem || 0,
    priceStep: blockfrostParams.price_step || 0,
    maxTxExMem: blockfrostParams.max_tx_ex_mem ? BigInt(blockfrostParams.max_tx_ex_mem) : 0n,
    maxTxExSteps: blockfrostParams.max_tx_ex_steps ? BigInt(blockfrostParams.max_tx_ex_steps) : 0n,
    coinsPerUtxoByte: blockfrostParams.coins_per_utxo_size ? BigInt(blockfrostParams.coins_per_utxo_size) : 0n,
    collateralPercentage: blockfrostParams.collateral_percent || 0,
    maxCollateralInputs: blockfrostParams.max_collateral_inputs || 0,
    minFeeRefScriptCostPerByte: blockfrostParams.min_fee_ref_script_cost_per_byte || 0,
    drepDeposit: blockfrostParams.drep_deposit ? BigInt(blockfrostParams.drep_deposit) : 0n,
    govActionDeposit: blockfrostParams.gov_action_deposit ? BigInt(blockfrostParams.gov_action_deposit) : 0n,
    costModels: {
      PlutusV1: (blockfrostParams.cost_models?.PlutusV1 as Record<string, number>) || {},
      PlutusV2: (blockfrostParams.cost_models?.PlutusV2 as Record<string, number>) || {},
      PlutusV3: (blockfrostParams.cost_models?.PlutusV3 as Record<string, number>) || {}
    }
  }
}

/**
 * Transform Blockfrost amounts to Core Assets
 */
export const transformAmounts = (amounts: ReadonlyArray<BlockfrostAmount>): CoreAssets.Assets => {
  let lovelace = 0n
  const multiAssetEntries: Array<[string, bigint]> = []

  for (const amount of amounts) {
    if (amount.unit === "lovelace") {
      lovelace = BigInt(amount.quantity)
    } else {
      multiAssetEntries.push([amount.unit, BigInt(amount.quantity)])
    }
  }

  // Build Core Assets starting with lovelace
  let assets = CoreAssets.fromLovelace(lovelace)

  // Add multi-assets if any using hex strings
  for (const [unit, qty] of multiAssetEntries) {
    // Parse unit - policyId is first 56 chars, assetName is remainder
    const policyIdHex = unit.slice(0, 56)
    const assetNameHex = unit.slice(56)
    assets = CoreAssets.addByHex(assets, policyIdHex, assetNameHex, qty)
  }

  return assets
}

/**
 * Transform Blockfrost delegation to delegation info
 */
export const transformDelegation = (blockfrostDelegation: BlockfrostDelegation): Provider.Delegation => {
  if (!blockfrostDelegation.pool_id) {
    return { poolId: null, rewards: BigInt(blockfrostDelegation.withdrawable_amount) }
  }

  const poolId = Schema.decodeSync(PoolKeyHash.FromBech32)(blockfrostDelegation.pool_id)
  return { poolId, rewards: BigInt(blockfrostDelegation.withdrawable_amount) }
}

/**
 * Transform JSONWSP-wrapped Ogmios evaluation response to Evolution SDK format
 * Used by /utils/txs/evaluate/utxos endpoint
 * Format: { result: { EvaluationResult: { "spend:0": { "memory": 1100, "steps": 160100 }, ... } } }
 */
export const transformJsonwspOgmiosEvaluationResult = (
  jsonwspResponse: JsonwspOgmiosEvaluationResponse
): Effect.Effect<Array<EvalRedeemer>, ProviderError> => {
  // Handle JSONWSP fault response (Ogmios backend error)
  if (jsonwspResponse.type === "jsonwsp/fault") {
    const faultMessage = jsonwspResponse.fault?.string ?? "unknown fault"
    return Effect.fail(
      new ProviderError({
        message: `Blockfrost evaluation fault: ${faultMessage}`,
        cause: jsonwspResponse
      })
    )
  }

  // Handle missing result field
  if (!jsonwspResponse.result) {
    return Effect.fail(
      new ProviderError({
        message: `Blockfrost evaluation returned no result`,
        cause: jsonwspResponse
      })
    )
  }

  // Check for evaluation failure
  if (jsonwspResponse.result.EvaluationFailure) {
    const failure = jsonwspResponse.result.EvaluationFailure
    return Effect.fail(
      new ProviderError({
        message: `Blockfrost script evaluation failed`,
        cause: failure
      })
    )
  }

  // Handle success case
  const evaluationResult = jsonwspResponse.result.EvaluationResult
  if (!evaluationResult) {
    return Effect.fail(
      new ProviderError({
        message: `Blockfrost evaluation returned no result`,
        cause: "No EvaluationResult in response"
      })
    )
  }

  const result: Array<EvalRedeemer> = []

  for (const [key, budget] of Object.entries(evaluationResult)) {
    // Parse "spend:0", "mint:1", "certificate:0", "withdrawal:0", etc.
    // Blockfrost uses Ogmios v5 JSONWSP which returns "certificate" and "withdrawal";
    // normalize to the SDK's canonical tags "cert" and "reward" (Ogmios v6 / CDDL names).
    const [rawTag, indexStr] = key.split(":")
    const index = parseInt(indexStr, 10)
    const tag = rawTag === "certificate" ? "cert" : rawTag === "withdrawal" ? "reward" : rawTag

    result.push({
      ex_units: new Redeemer.ExUnits({
        mem: BigInt(budget.memory),
        steps: BigInt(budget.steps)
      }),
      redeemer_index: index,
      redeemer_tag: tag as any
    })
  }

  return Effect.succeed(result)
}
