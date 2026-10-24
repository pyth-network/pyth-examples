import type { Effect } from "effect"
import { Context, Data } from "effect"

import type * as CoreAddress from "../../Address.js"
import type * as Credential from "../../Credential.js"
import type * as PlutusData from "../../Data.js"
import type * as DatumHash from "../../DatumHash.js"
import type * as PoolKeyHash from "../../PoolKeyHash.js"
import type * as RewardAddress from "../../RewardAddress.js"
import type * as Transaction from "../../Transaction.js"
import type * as TransactionHash from "../../TransactionHash.js"
import type * as TransactionInput from "../../TransactionInput.js"
import type * as CoreUTxO from "../../UTxO.js"
import type { EvalRedeemer } from "../EvalRedeemer.js"
import type { EffectToPromiseAPI } from "../Type.js"

/**
 * Protocol Parameters for the Cardano network.
 * Defines operational rules and limits used by providers.
 *
 * @since 2.0.0
 * @category model
 */
export type ProtocolParameters = {
  readonly minFeeA: number
  readonly minFeeB: number
  readonly maxTxSize: number
  readonly maxValSize: number
  readonly keyDeposit: bigint
  readonly poolDeposit: bigint
  readonly drepDeposit: bigint
  readonly govActionDeposit: bigint
  readonly priceMem: number
  readonly priceStep: number
  readonly maxTxExMem: bigint
  readonly maxTxExSteps: bigint
  readonly coinsPerUtxoByte: bigint
  readonly collateralPercentage: number
  readonly maxCollateralInputs: number
  readonly minFeeRefScriptCostPerByte: number
  readonly costModels: {
    readonly PlutusV1: Record<string, number>
    readonly PlutusV2: Record<string, number>
    readonly PlutusV3: Record<string, number>
  }
}

/**
 * Delegation information including pool ID and rewards.
 *
 * @since 2.0.0
 * @category model
 */
export interface Delegation {
  readonly poolId: PoolKeyHash.PoolKeyHash | null
  readonly rewards: bigint
}

/**
 * Error class for provider-related operations.
 * Represents failures when communicating with blockchain providers or fetching data.
 *
 * @since 2.0.0
 * @category errors
 */
export class ProviderError extends Data.TaggedError("ProviderError")<{
  readonly cause: unknown
  readonly message: string
}> {}

/**
 * Effect-based provider interface for blockchain data access and submission.
 * Provides methods to query UTxOs, protocol parameters, delegation info, and submit transactions.
 *
 * @since 2.0.0
 * @category model
 */
export interface ProviderEffect {
  /**
   * Retrieve current protocol parameters from the blockchain.
   */
  readonly getProtocolParameters: () => Effect.Effect<ProtocolParameters, ProviderError>
  /**
   * Query UTxOs at a given address or by credential.
   */
  readonly getUtxos: (
    addressOrCredential: CoreAddress.Address | Credential.Credential
  ) => Effect.Effect<Array<CoreUTxO.UTxO>, ProviderError>
  /**
   * Query UTxOs at a given address or credential filtered by specific unit.
   */
  readonly getUtxosWithUnit: (
    addressOrCredential: CoreAddress.Address | Credential.Credential,
    unit: string
  ) => Effect.Effect<Array<CoreUTxO.UTxO>, ProviderError>
  /**
   * Query a single UTxO by its unit identifier.
   * Unit format: policyId (56 hex chars) + assetName (0-64 hex chars)
   */
  readonly getUtxoByUnit: (unit: string) => Effect.Effect<CoreUTxO.UTxO, ProviderError>
  /**
   * Query UTxOs by their transaction inputs (output references).
   */
  readonly getUtxosByOutRef: (
    inputs: ReadonlyArray<TransactionInput.TransactionInput>
  ) => Effect.Effect<Array<CoreUTxO.UTxO>, ProviderError>
  /**
   * Query delegation info for a reward address.
   */
  readonly getDelegation: (rewardAddress: RewardAddress.RewardAddress) => Effect.Effect<Delegation, ProviderError>
  /**
   * Query a datum by its hash.
   * Returns the parsed PlutusData structure.
   */
  readonly getDatum: (datumHash: DatumHash.DatumHash) => Effect.Effect<PlutusData.Data, ProviderError>
  /**
   * Wait for a transaction to be confirmed on the blockchain.
   */
  readonly awaitTx: (
    txHash: TransactionHash.TransactionHash,
    checkInterval?: number,
    timeout?: number
  ) => Effect.Effect<boolean, ProviderError>
  /**
   * Submit a signed transaction to the blockchain.
   * @param tx - Signed transaction to submit
   * @returns Transaction hash of the submitted transaction
   */
  readonly submitTx: (tx: Transaction.Transaction) => Effect.Effect<TransactionHash.TransactionHash, ProviderError>
  /**
   * Evaluate a transaction to determine script execution costs.
   * @param tx - Transaction to evaluate
   * @param additionalUTxOs - Additional UTxOs to include in evaluation context
   */
  readonly evaluateTx: (
    tx: Transaction.Transaction,
    additionalUTxOs?: Array<CoreUTxO.UTxO>
  ) => Effect.Effect<Array<EvalRedeemer>, ProviderError>
}

/**
 * Context tag for ProviderEffect dependency injection.
 * Use this to require a provider in your Effect computations.
 *
 * @since 2.0.0
 * @category model
 */
export const ProviderEffect: Context.Tag<ProviderEffect, ProviderEffect> =
  Context.GenericTag<ProviderEffect>("@evolution/ProviderService")

/**
 * Promise-based provider interface for blockchain data access and submission.
 * Auto-generated wrapper around ProviderEffect with promise-based methods.
 *
 * @since 2.0.0
 * @category model
 */
export interface Provider extends EffectToPromiseAPI<ProviderEffect> {
  readonly Effect: ProviderEffect
}
