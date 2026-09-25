import { serializeRewardAddress } from "@meshsdk/core";

// ---------------------------------------------------------------------------
// Pyth Lazer configuration — set via env or override for tests.
// ---------------------------------------------------------------------------

export const PYTH_POLICY_ID =
  process.env.NEXT_PUBLIC_PYTH_POLICY_ID ??
  "01010101010101010101010101010101010101010101010101010101";

export const PYTH_WITHDRAW_SCRIPT_HASH =
  process.env.NEXT_PUBLIC_PYTH_WITHDRAW_SCRIPT_HASH ?? "";

export const PYTH_STATE_TX_HASH =
  process.env.NEXT_PUBLIC_PYTH_STATE_TX_HASH ?? "";

export const PYTH_STATE_TX_INDEX = Number(
  process.env.NEXT_PUBLIC_PYTH_STATE_TX_INDEX ?? "0"
);

export const PYTH_SCRIPT_REF_TX_HASH =
  process.env.NEXT_PUBLIC_PYTH_SCRIPT_REF_TX_HASH ?? "";

export const PYTH_SCRIPT_REF_TX_INDEX = Number(
  process.env.NEXT_PUBLIC_PYTH_SCRIPT_REF_TX_INDEX ?? "0"
);

export const PYTH_LAZER_TOKEN =
  process.env.NEXT_PUBLIC_PYTH_LAZER_TOKEN ?? "";

export const ADA_USD_FEED_ID = 16;

function safeShutdown(client: { shutdown: () => void }) {
  try {
    client.shutdown();
  } catch {
    // Some one-shot clients have no websocket pool; ignore shutdown failure.
  }
}

// ---------------------------------------------------------------------------
// Reward address for the Pyth withdraw script (preprod = network 0).
// ---------------------------------------------------------------------------

export function pythRewardAddress(network: 0 | 1 = 0): string {
  return serializeRewardAddress(PYTH_WITHDRAW_SCRIPT_HASH, true, network);
}

function isHexOfLength(value: string, hexLength: number): boolean {
  return new RegExp(`^[0-9a-fA-F]{${hexLength}}$`).test(value);
}

export function validatePythWithdrawConfig(): string[] {
  const missingOrInvalid: string[] = [];

  if (!isHexOfLength(PYTH_WITHDRAW_SCRIPT_HASH, 56)) {
    missingOrInvalid.push("NEXT_PUBLIC_PYTH_WITHDRAW_SCRIPT_HASH (56 hex chars)");
  }
  if (!isHexOfLength(PYTH_STATE_TX_HASH, 64)) {
    missingOrInvalid.push("NEXT_PUBLIC_PYTH_STATE_TX_HASH (64 hex chars)");
  }
  if (!isHexOfLength(PYTH_SCRIPT_REF_TX_HASH, 64)) {
    missingOrInvalid.push("NEXT_PUBLIC_PYTH_SCRIPT_REF_TX_HASH (64 hex chars)");
  }
  if (!Number.isInteger(PYTH_STATE_TX_INDEX) || PYTH_STATE_TX_INDEX < 0) {
    missingOrInvalid.push("NEXT_PUBLIC_PYTH_STATE_TX_INDEX (non-negative integer)");
  }
  if (!Number.isInteger(PYTH_SCRIPT_REF_TX_INDEX) || PYTH_SCRIPT_REF_TX_INDEX < 0) {
    missingOrInvalid.push("NEXT_PUBLIC_PYTH_SCRIPT_REF_TX_INDEX (non-negative integer)");
  }

  return missingOrInvalid;
}

// ---------------------------------------------------------------------------
// Fetch signed update from Pyth Lazer (REST one-shot via SDK).
// Returns the raw hex string to be used as the withdrawal redeemer.
// ---------------------------------------------------------------------------

export async function fetchSignedUpdate(): Promise<string> {
  const { PythLazerClient } = await import("@pythnetwork/pyth-lazer-sdk");
  const client = await PythLazerClient.create({ token: PYTH_LAZER_TOKEN });
  try {
    const result = await client.getLatestPrice({
      priceFeedIds: [ADA_USD_FEED_ID],
      properties: ["price", "exponent"],
      channel: "fixed_rate@200ms",
      formats: ["solana"],
      jsonBinaryEncoding: "hex",
    });
    if (!result.solana?.data) {
      throw new Error("Pyth Lazer: no solana payload in response");
    }
    return result.solana.data;
  } finally {
    safeShutdown(client);
  }
}

export async function fetchAdaUsdPriceFromPyth(): Promise<number> {
  const { PythLazerClient } = await import("@pythnetwork/pyth-lazer-sdk");
  const client = await PythLazerClient.create({ token: PYTH_LAZER_TOKEN });
  try {
    const result = await client.getLatestPrice({
      priceFeedIds: [ADA_USD_FEED_ID],
      properties: ["price", "exponent"],
      formats: ["solana"],
      parsed: true,
      channel: "fixed_rate@200ms",
      jsonBinaryEncoding: "hex",
    });

    const feed = result.parsed?.priceFeeds?.[0];
    const priceRaw = feed?.price;
    const exponent = feed?.exponent;

    if (typeof priceRaw !== "string" || typeof exponent !== "number") {
      throw new Error("Pyth Lazer: parsed ADA/USD price is missing");
    }

    const normalized = Number(priceRaw) * Math.pow(10, exponent);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      throw new Error("Pyth Lazer: parsed ADA/USD price is invalid");
    }
    return normalized;
  } finally {
    safeShutdown(client);
  }
}

// ---------------------------------------------------------------------------
// Build Mesh-compatible redeemer for the Pyth 0-withdrawal.
// The on-chain contract expects List<ByteArray>.
// Mesh serializer in this project maps:
// - string => ByteArray
// - array  => List
// ---------------------------------------------------------------------------

export function buildPythRedeemer(signedUpdateHex: string) {
  return [signedUpdateHex];
}
