import { Effect } from "effect"

import * as BlockfrostEffect from "./internal/BlockfrostEffect.js"
import type { Provider, ProviderEffect } from "./Provider.js"

/**
 * Blockfrost provider for Cardano blockchain data access.
 * Supports both mainnet and testnet networks with project-based authentication.
 * Implements rate limiting to respect Blockfrost API limits.
 *
 * @since 2.0.0
 * @category constructors
 */
export class BlockfrostProvider implements Provider {
  readonly Effect: ProviderEffect
  readonly baseUrl: string
  readonly projectId?: string

  constructor(baseUrl: string, projectId?: string) {
    this.baseUrl = baseUrl
    this.projectId = projectId

    this.Effect = {
      getProtocolParameters: () => BlockfrostEffect.getProtocolParameters(baseUrl, projectId),
      getUtxos: BlockfrostEffect.getUtxos(baseUrl, projectId),
      getUtxosWithUnit: BlockfrostEffect.getUtxosWithUnit(baseUrl, projectId),
      getUtxoByUnit: BlockfrostEffect.getUtxoByUnit(baseUrl, projectId),
      getUtxosByOutRef: BlockfrostEffect.getUtxosByOutRef(baseUrl, projectId),
      getDelegation: BlockfrostEffect.getDelegation(baseUrl, projectId),
      getDatum: BlockfrostEffect.getDatum(baseUrl, projectId),
      awaitTx: BlockfrostEffect.awaitTx(baseUrl, projectId),
      submitTx: BlockfrostEffect.submitTx(baseUrl, projectId),
      evaluateTx: BlockfrostEffect.evaluateTx(baseUrl, projectId)
    }
  }

  getProtocolParameters = () => Effect.runPromise(this.Effect.getProtocolParameters())

  getUtxos = (addressOrCredential: Parameters<Provider["getUtxos"]>[0]) =>
    Effect.runPromise(this.Effect.getUtxos(addressOrCredential))

  getUtxosWithUnit = (
    addressOrCredential: Parameters<Provider["getUtxosWithUnit"]>[0],
    unit: Parameters<Provider["getUtxosWithUnit"]>[1]
  ) => Effect.runPromise(this.Effect.getUtxosWithUnit(addressOrCredential, unit))

  getUtxoByUnit = (unit: Parameters<Provider["getUtxoByUnit"]>[0]) => Effect.runPromise(this.Effect.getUtxoByUnit(unit))

  getUtxosByOutRef = (outRefs: Parameters<Provider["getUtxosByOutRef"]>[0]) =>
    Effect.runPromise(this.Effect.getUtxosByOutRef(outRefs))

  getDelegation = (rewardAddress: Parameters<Provider["getDelegation"]>[0]) =>
    Effect.runPromise(this.Effect.getDelegation(rewardAddress))

  getDatum = (datumHash: Parameters<Provider["getDatum"]>[0]) => Effect.runPromise(this.Effect.getDatum(datumHash))

  awaitTx = (
    txHash: Parameters<Provider["awaitTx"]>[0],
    checkInterval?: Parameters<Provider["awaitTx"]>[1],
    timeout?: Parameters<Provider["awaitTx"]>[2]
  ) => Effect.runPromise(this.Effect.awaitTx(txHash, checkInterval, timeout))

  submitTx = (cbor: Parameters<Provider["submitTx"]>[0]) => Effect.runPromise(this.Effect.submitTx(cbor))

  evaluateTx = (tx: Parameters<Provider["evaluateTx"]>[0], additionalUTxOs?: Parameters<Provider["evaluateTx"]>[1]) =>
    Effect.runPromise(this.Effect.evaluateTx(tx, additionalUTxOs))
}

/**
 * Pre-configured Blockfrost provider for Cardano mainnet.
 *
 * @since 2.0.0
 * @category constructors
 */
export const mainnet = (projectId: string): BlockfrostProvider =>
  new BlockfrostProvider("https://cardano-mainnet.blockfrost.io/api/v0", projectId)

/**
 * Pre-configured Blockfrost provider for Cardano preprod testnet.
 *
 * @since 2.0.0
 * @category constructors
 */
export const preprod = (projectId: string): BlockfrostProvider =>
  new BlockfrostProvider("https://cardano-preprod.blockfrost.io/api/v0", projectId)

/**
 * Pre-configured Blockfrost provider for Cardano preview testnet.
 *
 * @since 2.0.0
 * @category constructors
 */
export const preview = (projectId: string): BlockfrostProvider =>
  new BlockfrostProvider("https://cardano-preview.blockfrost.io/api/v0", projectId)

/**
 * Create a custom Blockfrost provider with custom base URL.
 *
 * @since 2.0.0
 * @category constructors
 */
export const custom = (baseUrl: string, projectId?: string): BlockfrostProvider =>
  new BlockfrostProvider(baseUrl, projectId)
