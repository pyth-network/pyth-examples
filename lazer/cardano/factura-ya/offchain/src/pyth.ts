/**
 * Pyth Pro integration for Factura Ya.
 *
 * Uses the official SDKs:
 * - @pythnetwork/pyth-lazer-sdk: WebSocket price feed subscription
 * - @pythnetwork/pyth-lazer-cardano-js: Cardano transaction helpers
 *   (getPythState, getPythScriptHash, createEvolutionClient)
 */

import {
  PythLazerClient,
  type JsonOrBinaryResponse,
} from "@pythnetwork/pyth-lazer-sdk";
import {
  getPythState,
  getPythScriptHash,
} from "@pythnetwork/pyth-lazer-cardano-js";
import type { UTxO } from "@evolution-sdk/evolution";
import type { ProviderOnlyClient } from "@evolution-sdk/evolution/sdk/client/Client";

// Re-export official helpers for convenience
export { getPythState, getPythScriptHash };

// --- Configuration ---

/** Pyth PreProd deployment Policy ID. */
export const PYTH_PREPROD_POLICY_ID =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

/** ADA/USD feed ID on Pyth Pro. */
export const ADA_USD_FEED_ID = 16;

/** USD/ARS feed ID (coming soon on Pyth Pro). */
export const USD_ARS_FEED_ID = 2582;

/** Default WebSocket endpoint for Pyth Pro. */
const DEFAULT_WS_URL = "wss://pyth-lazer.dourolabs.app/v2/ws";

// --- Types ---

export interface PythClientConfig {
  accessToken: string;
  wsUrl?: string;
  feedIds?: number[];
  numConnections?: number;
}

// --- Client ---

/**
 * Manages a connection to Pyth Pro WebSocket and caches the latest
 * price update for use in transaction construction.
 */
export class PythPriceClient {
  private client: PythLazerClient | null = null;
  private latestSolanaHex: string | null = null;

  constructor(private config: PythClientConfig) {}

  /** Create the WebSocket connection and start subscribing. */
  async connect(): Promise<void> {
    if (this.client) return;

    const wsUrl = this.config.wsUrl ?? DEFAULT_WS_URL;

    this.client = await PythLazerClient.create(
      [wsUrl],
      this.config.accessToken,
      this.config.numConnections ?? 1,
    );

    const feedIds = this.config.feedIds ?? [ADA_USD_FEED_ID];

    await this.client.subscribe({
      type: "subscribe",
      subscriptionId: 1,
      priceFeedIds: feedIds,
      properties: ["price", "exponent"],
      chains: ["solana"],
      channel: "fixed_rate@200ms",
      jsonBinaryEncoding: "hex",
      parsed: false,
    });

    this.client.addMessageListener((message: JsonOrBinaryResponse) => {
      if (message.type === "json") {
        const val = message.value;
        if (val.type === "streamUpdated" && val.solana) {
          this.latestSolanaHex = val.solana.data;
        }
      } else if (message.type === "binary") {
        if (message.value.solana) {
          this.latestSolanaHex = message.value.solana.toString("hex");
        }
      }
    });
  }

  /**
   * Get the latest raw price update as a Buffer for use as the
   * withdraw-script redeemer in a Cardano transaction.
   */
  getLatestUpdateBuffer(): Buffer {
    if (!this.latestSolanaHex) {
      throw new Error(
        "No Pyth price update available yet. Call connect() first and wait for data.",
      );
    }
    return Buffer.from(this.latestSolanaHex, "hex");
  }

  /** Get the latest update as hex string. */
  getLatestUpdateHex(): string {
    if (!this.latestSolanaHex) {
      throw new Error(
        "No Pyth price update available yet. Call connect() first and wait for data.",
      );
    }
    return this.latestSolanaHex;
  }

  /** Check if we have received at least one price update. */
  hasUpdate(): boolean {
    return this.latestSolanaHex !== null;
  }

  /** Wait until the first price update arrives. */
  async waitForUpdate(timeoutMs = 10_000): Promise<void> {
    const start = Date.now();
    while (!this.hasUpdate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timed out waiting for Pyth price update");
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /** Shut down the WebSocket connections. */
  shutdown(): void {
    this.client?.shutdown();
    this.client = null;
    this.latestSolanaHex = null;
  }
}

// --- Transaction helpers ---

/**
 * Fetch the Pyth on-chain state and build all params needed for a Pyth tx.
 *
 * Usage with Evolution SDK:
 * ```typescript
 * const params = await preparePythTx(client, priceClient);
 *
 * const now = BigInt(Date.now());
 * const tx = wallet.newTx()
 *   .setValidity({ from: now - 60_000n, to: now + 60_000n })
 *   .readFrom({ referenceInputs: [params.stateUtxo] })
 *   .withdraw({
 *     amount: 0n,
 *     redeemer: [params.updateBuffer],
 *     stakeCredential: ScriptHash.fromHex(params.withdrawScriptHash),
 *   });
 * ```
 */
export interface PythTxParams {
  stateUtxo: UTxO.UTxO;
  withdrawScriptHash: string;
  updateBuffer: Buffer;
}

export async function preparePythTx(
  cardanoClient: ProviderOnlyClient,
  priceClient: PythPriceClient,
  policyId: string = PYTH_PREPROD_POLICY_ID,
): Promise<PythTxParams> {
  const stateUtxo = await getPythState(policyId, cardanoClient);
  const withdrawScriptHash = getPythScriptHash(stateUtxo);
  const updateBuffer = priceClient.getLatestUpdateBuffer();

  return { stateUtxo, withdrawScriptHash, updateBuffer };
}
