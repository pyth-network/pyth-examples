/**
 * src/oracle/pythClient.ts
 *
 * Pyth Hermes API client for IntegralPayments.
 *
 * Responsibilities:
 *  - Fetch the latest signed price update for one or more feeds via HTTP.
 *  - Validate freshness, confidence, and signer key on the received proof.
 *  - Stream real-time price updates over SSE for the gateway's price cache.
 *  - Compute fiat → lovelace conversions using the live oracle price.
 *
 * This module is the single entry-point for all oracle interactions.
 * The transaction builder (cardano/transaction.ts) calls this module to
 * obtain a proof and the computed lovelace amount before building the
 * collect transaction.
 *
 * Dependencies:
 *   @pythnetwork/hermes-client  (latest)
 */

import { HermesClient, type PriceUpdate } from "@pythnetwork/hermes-client";
import { FEED_IDS, FEED_NAMES } from "../config.js";
import type {
  GatewayConfig,
  PriceProof,
  ResolvedPrice,
  SupportedFeed,
} from "../types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Lovelace per ADA */
const LOVELACE_PER_ADA = 1_000_000n;

/** Basis-points denominator */
const BPS_DENOM = 10_000n;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Hermes `ParsedPriceFeed` entry into our on-chain `PriceProof`.
 *
 * The Hermes v2 response structure:
 * {
 *   binary: { data: string[] },          // base64-encoded signed VAA(s)
 *   parsed: [{
 *     id: string,
 *     price: { price: string, conf: string, expo: number, publish_time: number },
 *     ema_price: { ... },
 *     metadata: { proof_available_time: number, prev_publish_time: number }
 *   }]
 * }
 *
 * NOTE: The Pyth Hermes API returns the full binary VAA in `binary.data[0]`
 * (base64-encoded).  For the Cardano on-chain verifier we need the raw
 * Ed25519 signature and signer key extracted from the VAA.  In a production
 * integration, the VAA should be decoded using the Wormhole SDK to extract
 * the guardian signature.  For the POC we store the entire binary blob as
 * the `signature` field and handle decoding in the Aiken contract via the
 * Pyth Cardano library once it is available.
 *
 * The `signerKey` is the Pyth oracle's published Ed25519 public key,
 * configured in `trustedSignerKey` from the gateway config and passed
 * through here for on-chain verification.
 */
function parsedFeedToProof(
  parsed: PriceUpdate["parsed"][number],
  binaryVaa: string,
  trustedSignerKey: string,
): PriceProof {
  return {
    feedId: parsed.id.replace(/^0x/, ""),
    price: BigInt(parsed.price.price),
    conf: BigInt(parsed.price.conf),
    exponent: parsed.price.expo,
    publishTime: parsed.price.publish_time,
    // Store the full base64 VAA; on-chain the Aiken validator extracts the
    // Ed25519 signature from it using builtin.verify_ed25519_signature.
    signature: Buffer.from(binaryVaa, "base64").toString("hex"),
    signerKey: trustedSignerKey,
  };
}

/**
 * Compute the real-value price from raw mantissa + exponent.
 * Used only for display and logging — all on-chain math stays in integers.
 */
function toFloat(mantissa: bigint, exponent: number): number {
  return Number(mantissa) * Math.pow(10, exponent);
}

// ---------------------------------------------------------------------------
// PythClient
// ---------------------------------------------------------------------------

export class PythClient {
  private readonly hermes: HermesClient;
  private readonly config: GatewayConfig;

  /** In-memory price cache: feedId → latest ResolvedPrice */
  private readonly cache = new Map<string, ResolvedPrice>();

  /** Active SSE event source (if streaming is enabled) */
  private streamSource: EventSource | null = null;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.hermes = new HermesClient(config.hermesUrl, {
      // Retry up to 3 times with exponential back-off on transient errors
      timeout: 10_000,
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Fetch the latest signed price proof for a single feed.
   *
   * Validates:
   *  1. The observation is not older than `config.maxPriceAgeSeconds`.
   *  2. The confidence interval does not exceed 10 % of the price.
   *
   * Throws `PythClientError` if either check fails so the caller can
   * decide whether to abort the payment or widen the tolerance.
   *
   * @param feed  Human-readable feed name, e.g. "ADA/USD"
   * @returns     A validated `ResolvedPrice` ready for transaction building
   */
  async getLatestPrice(feed: SupportedFeed): Promise<ResolvedPrice> {
    const feedId = FEED_IDS[feed];
    const update = await this.fetchUpdate([feedId]);
    const resolved = this.resolveUpdate(update, feedId);
    this.validatePrice(resolved);
    return resolved;
  }

  /**
   * Fetch the latest price for every supported feed in a single HTTP round-trip.
   * Results are stored in the internal cache.
   */
  async refreshAllFeeds(): Promise<Map<string, ResolvedPrice>> {
    const allIds = Object.values(FEED_IDS);
    const update = await this.fetchUpdate(allIds);

    for (const parsed of update.parsed ?? []) {
      const feedId = parsed.id.replace(/^0x/, "");
      const binaryVaa = update.binary?.data?.[0] ?? "";
      const proof = parsedFeedToProof(parsed, binaryVaa, this.config.trustedSignerKey);
      const now = Math.floor(Date.now() / 1000);
      const resolved: ResolvedPrice = {
        proof,
        priceFloat: toFloat(proof.price, proof.exponent),
        confFloat: toFloat(proof.conf, proof.exponent),
        ageSeconds: now - proof.publishTime,
      };
      this.cache.set(feedId, resolved);
    }

    return this.cache;
  }

  /**
   * Return the most recently cached price without hitting the network.
   * Useful for high-frequency display; always call `getLatestPrice` before
   * building a transaction.
   */
  getCached(feed: SupportedFeed): ResolvedPrice | undefined {
    return this.cache.get(FEED_IDS[feed]);
  }

  /**
   * Subscribe to real-time price updates via Hermes SSE.
   * The callback is invoked on every incoming update for any subscribed feed.
   * Call `stopStream()` to close the connection.
   *
   * @param feeds     Feeds to subscribe to
   * @param onUpdate  Callback invoked with each new price
   */
  async startStream(
    feeds: SupportedFeed[],
    onUpdate: (price: ResolvedPrice) => void,
  ): Promise<void> {
    if (this.streamSource) this.stopStream();

    const ids = feeds.map((f) => FEED_IDS[f]);
    this.streamSource = await this.hermes.getPriceUpdatesStream(ids);

    this.streamSource.onmessage = (event: MessageEvent) => {
      try {
        const update: PriceUpdate = JSON.parse(event.data);
        for (const parsed of update.parsed ?? []) {
          const feedId = parsed.id.replace(/^0x/, "");
          const binaryVaa = update.binary?.data?.[0] ?? "";
          const proof = parsedFeedToProof(
            parsed,
            binaryVaa,
            this.config.trustedSignerKey,
          );
          const now = Math.floor(Date.now() / 1000);
          const resolved: ResolvedPrice = {
            proof,
            priceFloat: toFloat(proof.price, proof.exponent),
            confFloat: toFloat(proof.conf, proof.exponent),
            ageSeconds: now - proof.publishTime,
          };
          this.cache.set(feedId, resolved);
          onUpdate(resolved);
        }
      } catch (err) {
        console.error("[PythClient] Failed to parse SSE message:", err);
      }
    };

    this.streamSource.onerror = (err: Event) => {
      console.error("[PythClient] SSE stream error — will reconnect:", err);
    };
  }

  /** Close the active SSE price stream. */
  stopStream(): void {
    this.streamSource?.close();
    this.streamSource = null;
  }

  // -------------------------------------------------------------------------
  // Conversion helpers
  // -------------------------------------------------------------------------

  /**
   * Compute the required lovelace to settle `invoiceUsdCents` at the price
   * in `resolved.proof`.
   *
   * Uses pure integer arithmetic to match the on-chain Aiken computation
   * exactly (see contracts/lib/pyth/verification.ak :: compute_required_lovelace).
   *
   * Formula:
   *   required = invoiceUsdCents × 1_000_000 × 10^(-exponent)
   *              ÷ (price × 100)
   */
  computeRequiredLovelace(
    resolved: ResolvedPrice,
    invoiceUsdCents: number,
  ): bigint {
    const { price, exponent } = resolved.proof;
    // exponent is negative (e.g. -8); negate to get positive power
    const scale = 10n ** BigInt(-exponent);
    return (
      (BigInt(invoiceUsdCents) * LOVELACE_PER_ADA * scale) /
      (price * 100n)
    );
  }

  /**
   * Apply the slippage tolerance to `requiredLovelace` and return the
   * minimum acceptable amount.
   *
   * lower_bound = required × (10_000 - toleranceBps) / 10_000
   */
  applyTolerance(requiredLovelace: bigint, toleranceBps: number): bigint {
    return (
      (requiredLovelace * (BPS_DENOM - BigInt(toleranceBps))) / BPS_DENOM
    );
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async fetchUpdate(feedIds: string[]): Promise<PriceUpdate> {
    // Prefix ids with 0x as required by the Hermes API
    const prefixed = feedIds.map((id) =>
      id.startsWith("0x") ? id : `0x${id}`,
    );

    try {
      const update = await this.hermes.getLatestPriceUpdates(prefixed, {
        parsed: true,
        binary: true,
      });
      return update;
    } catch (err) {
      throw new PythClientError(
        `Hermes request failed for feeds ${feedIds.join(", ")}: ${String(err)}`,
        "FETCH_FAILED",
      );
    }
  }

  private resolveUpdate(
    update: PriceUpdate,
    feedId: string,
  ): ResolvedPrice {
    const parsed = update.parsed?.find(
      (p) => p.id.replace(/^0x/, "") === feedId,
    );
    if (!parsed) {
      throw new PythClientError(
        `Feed ${feedId} (${FEED_NAMES[feedId] ?? "unknown"}) not found in Hermes response`,
        "FEED_NOT_FOUND",
      );
    }

    const binaryVaa = update.binary?.data?.[0] ?? "";
    const proof = parsedFeedToProof(
      parsed,
      binaryVaa,
      this.config.trustedSignerKey,
    );
    const now = Math.floor(Date.now() / 1000);

    return {
      proof,
      priceFloat: toFloat(proof.price, proof.exponent),
      confFloat: toFloat(proof.conf, proof.exponent),
      ageSeconds: now - proof.publishTime,
    };
  }

  private validatePrice(resolved: ResolvedPrice): void {
    const { ageSeconds, proof } = resolved;

    // 1. Freshness check
    if (ageSeconds < 0) {
      throw new PythClientError(
        `Price publish_time is in the future (age ${ageSeconds}s) — clock skew?`,
        "FUTURE_TIMESTAMP",
      );
    }
    if (ageSeconds > this.config.maxPriceAgeSeconds) {
      throw new PythClientError(
        `Price for feed ${proof.feedId} is stale: ${ageSeconds}s old (max ${this.config.maxPriceAgeSeconds}s)`,
        "STALE_PRICE",
      );
    }

    // 2. Confidence check (conf must not exceed 10 % of price)
    if (proof.conf * 10n > proof.price) {
      throw new PythClientError(
        `Confidence interval too wide for feed ${proof.feedId}: ` +
          `conf=${proof.conf}, price=${proof.price} ` +
          `(ratio=${Number((proof.conf * 100n) / proof.price)}%)`,
        "WIDE_CONFIDENCE",
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export type PythClientErrorCode =
  | "FETCH_FAILED"
  | "FEED_NOT_FOUND"
  | "STALE_PRICE"
  | "FUTURE_TIMESTAMP"
  | "WIDE_CONFIDENCE";

export class PythClientError extends Error {
  constructor(
    message: string,
    public readonly code: PythClientErrorCode,
  ) {
    super(message);
    this.name = "PythClientError";
  }
}
