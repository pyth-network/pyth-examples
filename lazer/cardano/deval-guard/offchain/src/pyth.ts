/**
 * Off-chain Pyth Pro helper for DevalGuard.
 *
 * Uses @pythnetwork/pyth-lazer-sdk for price fetching and
 * @pythnetwork/pyth-lazer-cardano-js for Cardano transaction integration
 * via the Pyth withdraw-script pattern.
 */

import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { getPythState, getPythScriptHash } from "@pythnetwork/pyth-lazer-cardano-js";

// --- Configuration ---

export interface PythConfig {
  /** Access token for Pyth Pro (LAZER_TOKEN env var) */
  accessToken: string;
  /** Pyth deployment policy ID on Cardano (hex) */
  pythPolicyId: string;
}

export const PREPROD_POLICY_ID =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

export const PREPROD_CONFIG: PythConfig = {
  accessToken: process.env.LAZER_TOKEN ?? "",
  pythPolicyId: PREPROD_POLICY_ID,
};

// Feed IDs
export const FEED_ADA_USD = 16;
export const FEED_USD_ARS = 2582; // Coming soon

// --- Price Update ---

export interface PriceUpdate {
  feedId: number;
  price: bigint;
  exponent: number;
  timestampUs: bigint;
  rawHex: string; // Solana-format binary for on-chain submission
}

type PriceCallback = (update: PriceUpdate) => void;

// --- Price Fetcher (one-shot, recommended for transactions) ---

/**
 * Fetch the latest price update from Pyth Pro.
 * Returns raw hex bytes suitable for on-chain submission.
 */
export async function fetchLatestPrice(
  config: PythConfig,
  feedIds: number[],
): Promise<PriceUpdate[]> {
  const client = await PythLazerClient.create({ token: config.accessToken });

  const result = await (client as any).getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: feedIds,
    properties: ["price", "exponent"],
  });

  const updates: PriceUpdate[] = [];
  if (result?.parsed?.priceFeeds && result?.solana?.data) {
    for (const feed of result.parsed.priceFeeds) {
      updates.push({
        feedId: feed.priceFeedId,
        price: BigInt(feed.price),
        exponent: feed.exponent,
        timestampUs: BigInt(result.parsed.timestampUs),
        rawHex: result.solana.data,
      });
    }
  }

  return updates;
}

// --- Price Subscriber (WebSocket, for live UI) ---

/**
 * Subscribes to Pyth Pro WebSocket and maintains the latest price update.
 * The raw binary data (solana format) is preserved for on-chain submission.
 */
export class PythPriceSubscriber {
  private client: PythLazerClient | null = null;
  private latestUpdate: Map<number, PriceUpdate> = new Map();
  private callbacks: PriceCallback[] = [];
  private config: PythConfig;

  constructor(config: PythConfig) {
    this.config = config;
  }

  async connect(feedIds: number[]): Promise<void> {
    this.client = new PythLazerClient(
      "wss://pyth-lazer.dourolabs.app/v2/ws",
      { accessToken: this.config.accessToken },
    );

    this.client.subscribe({
      feedIds,
      properties: ["price", "exponent"],
      channels: ["fixed_rate@200ms"],
      jsonBinaryEncoding: "hex",
      parsed: false,
    });

    this.client.addMessageListener((message: unknown) => {
      const msg = message as Record<string, unknown>;
      if (msg.type !== "json") return;
      const value = msg.value as Record<string, unknown>;
      if (value.type !== "streamUpdated") return;

      const solana = value.solana as { data: string } | undefined;
      const parsed = value.parsed as {
        timestampUs: string;
        priceFeeds: Array<{
          priceFeedId: number;
          price: string;
          exponent: number;
        }>;
      };

      if (!parsed?.priceFeeds || !solana?.data) return;

      for (const feed of parsed.priceFeeds) {
        const update: PriceUpdate = {
          feedId: feed.priceFeedId,
          price: BigInt(feed.price),
          exponent: feed.exponent,
          timestampUs: BigInt(parsed.timestampUs),
          rawHex: solana.data,
        };
        this.latestUpdate.set(feed.priceFeedId, update);
        for (const cb of this.callbacks) cb(update);
      }
    });
  }

  getLatest(feedId: number): PriceUpdate | undefined {
    return this.latestUpdate.get(feedId);
  }

  onUpdate(cb: PriceCallback): void {
    this.callbacks.push(cb);
  }

  disconnect(): void {
    this.client = null;
    this.latestUpdate.clear();
  }
}

// --- Transaction Helpers ---

/**
 * Get the Pyth State UTxO and withdraw script hash for transaction building.
 * Uses the official @pythnetwork/pyth-lazer-cardano-js SDK.
 */
export async function getPythTxContext(
  policyId: string,
  cardanoClient: any,
): Promise<{ pythState: any; withdrawScriptHash: string }> {
  const pythState = await getPythState(policyId, cardanoClient);
  const withdrawScriptHash = getPythScriptHash(pythState);
  return { pythState, withdrawScriptHash };
}

/**
 * Format a Pyth price as a human-readable number.
 * E.g., price=120000000000, exponent=-8 → "1200.00"
 */
export function formatPrice(price: bigint, exponent: number): string {
  const abs = exponent < 0 ? -exponent : exponent;
  const divisor = 10n ** BigInt(abs);
  if (exponent < 0) {
    const whole = price / divisor;
    const frac = price % divisor;
    const fracStr = frac.toString().padStart(abs, "0").slice(0, 2);
    return `${whole}.${fracStr}`;
  }
  return (price * divisor).toString();
}

// Re-export SDK utilities
export { getPythState, getPythScriptHash };
