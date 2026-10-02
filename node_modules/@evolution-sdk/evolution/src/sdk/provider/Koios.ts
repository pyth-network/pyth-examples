import { Effect } from "effect"

import * as KoiosEffect from "./internal/KoiosEffect.js"
import type { Provider, ProviderEffect } from "./Provider.js"

/**
 * Koios provider for Cardano blockchain data access.
 * Provides support for interacting with the Koios API across multiple environments.
 * Supports optional bearer token authentication.
 *
 * @since 2.0.0
 * @category constructors
 */
export class Koios implements Provider {
  private readonly baseUrl: string
  private readonly token?: string

  readonly Effect: ProviderEffect

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl
    this.token = token

    this.Effect = {
      getProtocolParameters: () => KoiosEffect.getProtocolParameters(this.baseUrl, this.token),
      getUtxos: KoiosEffect.getUtxos(this.baseUrl, this.token),
      getUtxosWithUnit: KoiosEffect.getUtxosWithUnit(this.baseUrl, this.token),
      getUtxoByUnit: KoiosEffect.getUtxoByUnit(this.baseUrl, this.token),
      getUtxosByOutRef: KoiosEffect.getUtxosByOutRef(this.baseUrl, this.token),
      getDelegation: KoiosEffect.getDelegation(this.baseUrl, this.token),
      getDatum: KoiosEffect.getDatum(this.baseUrl, this.token),
      awaitTx: KoiosEffect.awaitTx(this.baseUrl, this.token),
      submitTx: KoiosEffect.submitTx(this.baseUrl, this.token),
      evaluateTx: KoiosEffect.evaluateTx(this.baseUrl, this.token)
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

  submitTx = (tx: Parameters<Provider["submitTx"]>[0]) => Effect.runPromise(this.Effect.submitTx(tx))

  evaluateTx = (tx: Parameters<Provider["evaluateTx"]>[0], additionalUTxOs?: Parameters<Provider["evaluateTx"]>[1]) =>
    Effect.runPromise(this.Effect.evaluateTx(tx, additionalUTxOs))
}
