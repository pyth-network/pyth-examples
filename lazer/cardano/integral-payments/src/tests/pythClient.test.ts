/**
 * src/tests/pythClient.test.ts
 *
 * Unit tests for src/oracle/pythClient.ts
 *
 * These tests mock the Hermes API using Vitest's `vi.mock` so they run
 * fully offline without any network access.
 *
 * Run:  npm test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PythClient, PythClientError } from "../oracle/pythClient.js";
import type { GatewayConfig } from "../types.js";

// ---------------------------------------------------------------------------
// Test config fixture
// ---------------------------------------------------------------------------

const TEST_CONFIG: GatewayConfig = {
  network: "Preprod",
  blockfrostApiKey: "test_key",
  blockfrostUrl: "https://cardano-preprod.blockfrost.io/api/v0",
  hermesUrl: "https://hermes.pyth.network",
  validatorCbor: "deadbeef",
  trustedSignerKey:
    "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a",
  toleranceBps: 50,
  maxPriceAgeSeconds: 60,
  minDepositLovelace: 2_000_000n,
};

// Feed ids
const ADA_USD_FEED =
  "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d";

// ---------------------------------------------------------------------------
// Mock HermesClient
// ---------------------------------------------------------------------------

const mockGetLatestPriceUpdates = vi.fn();

vi.mock("@pythnetwork/hermes-client", () => ({
  HermesClient: vi.fn().mockImplementation(() => ({
    getLatestPriceUpdates: mockGetLatestPriceUpdates,
    getPriceUpdatesStream: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid fake Hermes response for ADA/USD at $0.35 */
function makeHermesResponse(overrides?: {
  price?: string;
  conf?: string;
  expo?: number;
  publish_time?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    parsed: [
      {
        id: `0x${ADA_USD_FEED}`,
        price: {
          price: overrides?.price ?? "35000000",
          conf: overrides?.conf ?? "175000",
          expo: overrides?.expo ?? -8,
          publish_time: overrides?.publish_time ?? now - 5, // 5 s ago — fresh
        },
        ema_price: {
          price: "35100000",
          conf: "200000",
          expo: -8,
          publish_time: now - 5,
        },
        metadata: {
          proof_available_time: now,
          prev_publish_time: now - 400,
        },
      },
    ],
    binary: {
      data: [Buffer.from("fake_vaa_bytes").toString("base64")],
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PythClient.getLatestPrice", () => {
  let client: PythClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new PythClient(TEST_CONFIG);
  });

  it("returns a resolved price for a valid fresh response", async () => {
    mockGetLatestPriceUpdates.mockResolvedValueOnce(makeHermesResponse());

    const resolved = await client.getLatestPrice("ADA/USD");

    expect(resolved.proof.feedId).toBe(ADA_USD_FEED);
    expect(resolved.proof.price).toBe(35_000_000n);
    expect(resolved.proof.exponent).toBe(-8);
    expect(resolved.priceFloat).toBeCloseTo(0.35, 6);
    expect(resolved.ageSeconds).toBeGreaterThanOrEqual(0);
    expect(resolved.ageSeconds).toBeLessThanOrEqual(10);
  });

  it("throws STALE_PRICE when publish_time is older than maxPriceAgeSeconds", async () => {
    const staleTime = Math.floor(Date.now() / 1000) - 90; // 90 s ago
    mockGetLatestPriceUpdates.mockResolvedValueOnce(
      makeHermesResponse({ publish_time: staleTime }),
    );

    await expect(client.getLatestPrice("ADA/USD")).rejects.toThrow(
      PythClientError,
    );
    await expect(client.getLatestPrice("ADA/USD")).rejects.toMatchObject({
      code: "STALE_PRICE",
    });
  });

  it("throws FUTURE_TIMESTAMP when publish_time is in the future", async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 30;
    mockGetLatestPriceUpdates.mockResolvedValueOnce(
      makeHermesResponse({ publish_time: futureTime }),
    );

    await expect(client.getLatestPrice("ADA/USD")).rejects.toMatchObject({
      code: "FUTURE_TIMESTAMP",
    });
  });

  it("throws WIDE_CONFIDENCE when conf > 10 % of price", async () => {
    // price = 35_000_000, conf = 4_000_000 → 11.4 % → too wide
    mockGetLatestPriceUpdates.mockResolvedValueOnce(
      makeHermesResponse({ conf: "4000000" }),
    );

    await expect(client.getLatestPrice("ADA/USD")).rejects.toMatchObject({
      code: "WIDE_CONFIDENCE",
    });
  });

  it("throws FETCH_FAILED when HermesClient throws a network error", async () => {
    mockGetLatestPriceUpdates.mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    await expect(client.getLatestPrice("ADA/USD")).rejects.toMatchObject({
      code: "FETCH_FAILED",
    });
  });
});

// ---------------------------------------------------------------------------

describe("PythClient.computeRequiredLovelace", () => {
  let client: PythClient;

  beforeEach(() => {
    client = new PythClient(TEST_CONFIG);
  });

  it("computes correct lovelace for $10.00 at ADA = $0.35", async () => {
    mockGetLatestPriceUpdates.mockResolvedValueOnce(makeHermesResponse());
    const resolved = await client.getLatestPrice("ADA/USD");

    const lovelace = client.computeRequiredLovelace(resolved, 1000); // $10.00
    // Expected: 1000 * 1_000_000 * 10^8 / (35_000_000 * 100) = 28_571_428
    expect(lovelace).toBeGreaterThanOrEqual(28_571_427n);
    expect(lovelace).toBeLessThanOrEqual(28_571_429n);
  });

  it("computes correct lovelace for $1.00 at ADA = $1.00", async () => {
    mockGetLatestPriceUpdates.mockResolvedValueOnce(
      makeHermesResponse({ price: "100000000" }), // $1.00
    );
    const resolved = await client.getLatestPrice("ADA/USD");

    const lovelace = client.computeRequiredLovelace(resolved, 100); // $1.00
    // Expected: 100 * 1_000_000 * 10^8 / (100_000_000 * 100) = 1_000_000
    expect(lovelace).toBe(1_000_000n);
  });

  it("lovelace increases as price decreases (inverse relationship)", async () => {
    // At $0.35: lovelace for $10
    mockGetLatestPriceUpdates.mockResolvedValueOnce(makeHermesResponse());
    const lowPrice = await client.getLatestPrice("ADA/USD");
    const lovelaceLow = client.computeRequiredLovelace(lowPrice, 1000);

    // At $0.70: lovelace for $10 (should be half)
    mockGetLatestPriceUpdates.mockResolvedValueOnce(
      makeHermesResponse({ price: "70000000" }),
    );
    const highPrice = await client.getLatestPrice("ADA/USD");
    const lovelaceHigh = client.computeRequiredLovelace(highPrice, 1000);

    expect(lovelaceLow).toBeGreaterThan(lovelaceHigh);
    // Should be roughly 2× as many lovelace at half the price
    const ratio = Number(lovelaceLow) / Number(lovelaceHigh);
    expect(ratio).toBeCloseTo(2, 0);
  });
});

// ---------------------------------------------------------------------------

describe("PythClient.applyTolerance", () => {
  let client: PythClient;

  beforeEach(() => {
    client = new PythClient(TEST_CONFIG);
  });

  it("returns exact amount for 0 bps tolerance", () => {
    const result = client.applyTolerance(10_000_000n, 0);
    expect(result).toBe(10_000_000n);
  });

  it("returns 99.5% of amount for 50 bps tolerance", () => {
    // 10_000_000 * (10_000 - 50) / 10_000 = 10_000_000 * 9950 / 10_000 = 9_950_000
    const result = client.applyTolerance(10_000_000n, 50);
    expect(result).toBe(9_950_000n);
  });

  it("returns 99% of amount for 100 bps tolerance", () => {
    const result = client.applyTolerance(10_000_000n, 100);
    expect(result).toBe(9_900_000n);
  });
});
