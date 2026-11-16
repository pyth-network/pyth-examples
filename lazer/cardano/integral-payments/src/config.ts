/**
 * src/config.ts
 *
 * Loads and validates gateway configuration from environment variables.
 * Call `loadConfig()` once at startup; the resulting object is passed
 * into service constructors and is never mutated at runtime.
 */

import type { CardanoNetwork, GatewayConfig } from "./types.js";

// ---------------------------------------------------------------------------
// Pyth feed identifiers (mainnet — same values as in contracts/lib/pyth/types.ak)
// ---------------------------------------------------------------------------

export const FEED_IDS = {
  "ADA/USD":
    "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  "BTC/USD":
    "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD":
    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "USDC/USD":
    "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
} as const;

/** Reverse map from feed id hex to human-readable name */
export const FEED_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(FEED_IDS).map(([name, id]) => [id, name]),
);

// ---------------------------------------------------------------------------
// Blockfrost endpoint templates
// ---------------------------------------------------------------------------

const BLOCKFROST_URLS: Record<CardanoNetwork, string> = {
  Mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
  Preprod: "https://cardano-preprod.blockfrost.io/api/v0",
  Preview: "https://cardano-preview.blockfrost.io/api/v0",
};

// ---------------------------------------------------------------------------
// Environment variable loader
// ---------------------------------------------------------------------------

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw new Error(`${key} must be an integer, got: ${raw}`);
  return n;
}

function optionalBigInt(key: string, fallback: bigint): bigint {
  const raw = process.env[key];
  if (!raw) return fallback;
  try {
    return BigInt(raw);
  } catch {
    throw new Error(`${key} must be a bigint-compatible integer, got: ${raw}`);
  }
}

/**
 * Load and validate the full gateway configuration from `process.env`.
 * Throws a descriptive error for every missing or malformed variable so
 * the operator knows exactly what to fix before the service starts.
 */
export function loadConfig(): GatewayConfig {
  const network = optional("NETWORK", "Preprod") as CardanoNetwork;
  if (!["Mainnet", "Preprod", "Preview"].includes(network)) {
    throw new Error(
      `NETWORK must be one of Mainnet | Preprod | Preview, got: ${network}`,
    );
  }

  const blockfrostApiKey = required("BLOCKFROST_API_KEY");
  const blockfrostUrl = optional(
    "BLOCKFROST_URL",
    BLOCKFROST_URLS[network],
  );
  const hermesUrl = optional(
    "PYTH_HERMES_URL",
    "https://hermes.pyth.network",
  );
  const validatorCbor = required("VALIDATOR_CBOR");
  const trustedSignerKey = required("TRUSTED_SIGNER_KEY");

  const toleranceBps = optionalInt("TOLERANCE_BPS", 50);
  if (toleranceBps < 0 || toleranceBps > 500) {
    throw new Error(
      `TOLERANCE_BPS must be between 0 and 500 bp, got: ${toleranceBps}`,
    );
  }

  const maxPriceAgeSeconds = optionalInt("MAX_PRICE_AGE_SECONDS", 60);
  const minDepositLovelace = optionalBigInt(
    "MIN_DEPOSIT_LOVELACE",
    2_000_000n,
  );

  return {
    network,
    blockfrostApiKey,
    blockfrostUrl,
    hermesUrl,
    validatorCbor,
    trustedSignerKey,
    toleranceBps,
    maxPriceAgeSeconds,
    minDepositLovelace,
  };
}
