/**
 * Off-chain transaction builders for DevalGuard insurance policies.
 *
 * Provides helpers to construct subscribe, claim, and expire transactions.
 */

import type { PriceUpdate } from "./pyth.js";

// --- Types ---

export interface PolicyDatum {
  owner: string; // bech32 address or pubkey hash hex
  strikePrice: bigint;
  strikeExponent: number;
  thresholdBps: number;
  premiumPaid: bigint;
  payoutAmount: bigint;
  expirySlot: bigint; // POSIX ms
  feedId: number;
  status: "Active" | "Claimed" | "Expired";
}

export interface ProtocolConfig {
  pythPolicyId: string;
  poolValidatorHash: string;
  policyValidatorHash: string;
  feedId: number;
  payoutMultiplier: number;
}

export const DEFAULT_PROTOCOL_CONFIG: Partial<ProtocolConfig> = {
  pythPolicyId: "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6",
  feedId: 16, // ADA/USD for now, 2582 for USD/ARS when available
  payoutMultiplier: 10,
};

// --- Subscribe ---

export interface SubscribeTxParams {
  /** Threshold in basis points (e.g., 1000 = 10%) */
  thresholdBps: number;
  /** Coverage period in milliseconds */
  coveragePeriodMs: bigint;
  /** Premium amount in lovelace */
  premiumAmount: bigint;
  /** Current Pyth price data */
  priceUpdate: PriceUpdate;
}

export interface SubscribeResult {
  policyDatum: PolicyDatum;
  payoutAmount: bigint;
  confirmationMessage: string;
}

export function buildSubscribeParams(
  params: SubscribeTxParams,
  config: ProtocolConfig,
  ownerAddress: string,
): SubscribeResult {
  if (params.thresholdBps <= 0 || params.thresholdBps > 10000) {
    throw new Error("Threshold must be between 1 and 10000 basis points");
  }
  if (params.premiumAmount <= 0n) {
    throw new Error("Premium must be positive");
  }

  const payoutAmount = params.premiumAmount * BigInt(config.payoutMultiplier);
  const now = BigInt(Date.now());
  const expirySlot = now + params.coveragePeriodMs;

  const policyDatum: PolicyDatum = {
    owner: ownerAddress,
    strikePrice: params.priceUpdate.price,
    strikeExponent: params.priceUpdate.exponent,
    thresholdBps: params.thresholdBps,
    premiumPaid: params.premiumAmount,
    payoutAmount,
    expirySlot,
    feedId: config.feedId,
    status: "Active",
  };

  const thresholdPct = params.thresholdBps / 100;
  const confirmationMessage =
    `If the exchange rate devalues ${thresholdPct}%, you receive ${formatLovelace(payoutAmount)} ADA`;

  return { policyDatum, payoutAmount, confirmationMessage };
}

// --- Claim ---

export interface ClaimCheckResult {
  eligible: boolean;
  currentDevaluationBps: number;
  thresholdBps: number;
  message: string;
}

export function checkClaimEligibility(
  policy: PolicyDatum,
  currentPrice: bigint,
  currentExponent: number,
): ClaimCheckResult {
  if (policy.status !== "Active") {
    return {
      eligible: false,
      currentDevaluationBps: 0,
      thresholdBps: policy.thresholdBps,
      message: `Policy is ${policy.status}, not Active`,
    };
  }

  const now = BigInt(Date.now());
  if (now > policy.expirySlot) {
    return {
      eligible: false,
      currentDevaluationBps: 0,
      thresholdBps: policy.thresholdBps,
      message: "Policy has expired",
    };
  }

  if (currentExponent !== policy.strikeExponent) {
    return {
      eligible: false,
      currentDevaluationBps: 0,
      thresholdBps: policy.thresholdBps,
      message: "Exponent mismatch — cannot compare prices",
    };
  }

  // Calculate devaluation in basis points
  const delta = currentPrice - policy.strikePrice;
  const devalBps =
    Number((delta * 10000n) / policy.strikePrice);

  const eligible = devalBps >= policy.thresholdBps;

  return {
    eligible,
    currentDevaluationBps: devalBps,
    thresholdBps: policy.thresholdBps,
    message: eligible
      ? `Devaluation ${(devalBps / 100).toFixed(1)}% exceeds threshold ${policy.thresholdBps / 100}% — claim eligible!`
      : `Devaluation ${(devalBps / 100).toFixed(1)}% below threshold ${policy.thresholdBps / 100}%`,
  };
}

// --- Expire ---

export function checkExpireEligibility(policy: PolicyDatum): {
  eligible: boolean;
  message: string;
} {
  if (policy.status !== "Active") {
    return { eligible: false, message: `Policy is ${policy.status}` };
  }

  const now = BigInt(Date.now());
  if (now <= policy.expirySlot) {
    const remaining = policy.expirySlot - now;
    const hoursLeft = Number(remaining) / 3_600_000;
    return {
      eligible: false,
      message: `Policy still active — ${hoursLeft.toFixed(1)} hours remaining`,
    };
  }

  return { eligible: true, message: "Policy expired — ready to close" };
}

// --- Helpers ---

function formatLovelace(lovelace: bigint): string {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toFixed(2);
}

/** Available coverage tiers for the UI */
export const COVERAGE_TIERS = [
  { label: "5%", bps: 500 },
  { label: "10%", bps: 1000 },
  { label: "15%", bps: 1500 },
  { label: "20%", bps: 2000 },
] as const;

/** Available coverage periods for the UI */
export const COVERAGE_PERIODS = [
  { label: "7 days", ms: 7n * 24n * 3600n * 1000n },
  { label: "14 days", ms: 14n * 24n * 3600n * 1000n },
  { label: "30 days", ms: 30n * 24n * 3600n * 1000n },
] as const;
