import { Effect } from "effect"

import * as KupmiosEffects from "./internal/KupmiosEffects.js"
import type { Provider, ProviderEffect } from "./Provider.js"

/**
 * Kupmios provider for Cardano blockchain data access.
 * Provides support for interacting with both Kupo and Ogmios APIs.
 * Supports custom headers for authentication with Demeter or other providers.
 *
 * @since 2.0.0
 * @category constructors
 */
export class KupmiosProvider implements Provider {
  private readonly kupoUrl: string
  private readonly ogmiosUrl: string
  private readonly headers?: {
    readonly ogmiosHeader?: Record<string, string>
    readonly kupoHeader?: Record<string, string>
  }

  readonly Effect: ProviderEffect

  constructor(
    kupoUrl: string,
    ogmiosUrl: string,
    headers?: {
      ogmiosHeader?: Record<string, string>
      kupoHeader?: Record<string, string>
    }
  ) {
    this.kupoUrl = kupoUrl
    this.ogmiosUrl = ogmiosUrl
    this.headers = headers

    this.Effect = {
      getProtocolParameters: () => KupmiosEffects.getProtocolParametersEffect(this.ogmiosUrl, this.headers),
      getUtxos: KupmiosEffects.getUtxosEffect(this.kupoUrl, this.headers),
      getUtxosWithUnit: KupmiosEffects.getUtxosWithUnitEffect(this.kupoUrl, this.headers),
      getUtxoByUnit: KupmiosEffects.getUtxoByUnitEffect(this.kupoUrl, this.headers),
      getUtxosByOutRef: KupmiosEffects.getUtxosByOutRefEffect(this.kupoUrl, this.headers),
      getDelegation: KupmiosEffects.getDelegationEffect(this.ogmiosUrl, this.headers),
      getDatum: KupmiosEffects.getDatumEffect(this.kupoUrl, this.headers),
      awaitTx: KupmiosEffects.awaitTxEffect(this.kupoUrl, this.headers),
      evaluateTx: KupmiosEffects.evaluateTxEffect(this.ogmiosUrl, this.headers),
      submitTx: KupmiosEffects.submitTxEffect(this.ogmiosUrl, this.headers)
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

  evaluateTx = (tx: Parameters<Provider["evaluateTx"]>[0], additionalUTxOs?: Parameters<Provider["evaluateTx"]>[1]) =>
    Effect.runPromise(this.Effect.evaluateTx(tx, additionalUTxOs))

  submitTx = (tx: Parameters<Provider["submitTx"]>[0]) => Effect.runPromise(this.Effect.submitTx(tx))
}
