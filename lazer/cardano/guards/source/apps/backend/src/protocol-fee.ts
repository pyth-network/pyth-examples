import type { CardanoSwapVenueConfig } from "./swap-venue.js";
import { feeBpsToPercentPoints } from "./swap-venue.js";

export type ProtocolFeeMode = "none" | "explicit_output" | "post_swap_reconciliation";

export interface ProtocolFeePolicy {
  provider: CardanoSwapVenueConfig["provider"];
  venueFeePercentPoints: number;
  protocolFeeBps: number;
  protocolFeePercentPoints: number;
  maxTotalFeeBps: number;
  maxTotalFeePercentPoints: number;
  protocolFeeMode: ProtocolFeeMode;
}

export interface RevenueBreakdown {
  grossAmount: number;
  venueFeeAmount: number;
  protocolFeeAmount: number;
  netAmount: number;
  venueFeePercentPoints: number;
  requestedProtocolFeePercentPoints: number;
  effectiveProtocolFeePercentPoints: number;
  totalFeePercentPoints: number;
  totalFeeBps: number;
  capped: boolean;
  capExceededByVenueFee: boolean;
  protocolFeeMode: ProtocolFeeMode;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value.toFixed(6));
}

export function resolveProtocolFeeMode(value: string): ProtocolFeeMode {
  switch (value) {
    case "none":
    case "post_swap_reconciliation":
      return value;
    default:
      return "explicit_output";
  }
}

export function buildProtocolFeePolicy(input: {
  provider: CardanoSwapVenueConfig["provider"];
  venueFeePercent: number;
  protocolFeeBps: number;
  maxTotalFeeBps: number;
  protocolFeeMode: string;
}): ProtocolFeePolicy {
  const protocolFeeBps = Math.max(0, Math.round(input.protocolFeeBps));
  const maxTotalFeeBps = Math.max(0, Math.round(input.maxTotalFeeBps));

  return {
    provider: input.provider,
    venueFeePercentPoints: clampPercent(input.venueFeePercent),
    protocolFeeBps,
    protocolFeePercentPoints: feeBpsToPercentPoints(protocolFeeBps),
    maxTotalFeeBps,
    maxTotalFeePercentPoints: feeBpsToPercentPoints(maxTotalFeeBps),
    protocolFeeMode: resolveProtocolFeeMode(input.protocolFeeMode),
  };
}

export function getConfiguredVenueFeePercent(config: CardanoSwapVenueConfig): number {
  if (config.provider === "dexhunter") {
    return clampPercent(config.dexHunter.partnerFeePercentPoints);
  }

  return 0;
}

export function applyRevenueFees(
  grossAmount: number,
  policy: ProtocolFeePolicy,
): RevenueBreakdown {
  const normalizedGrossAmount = Number.isFinite(grossAmount) && grossAmount > 0 ? grossAmount : 0;
  const requestedProtocolFeePercentPoints =
    policy.protocolFeeMode === "none" ? 0 : policy.protocolFeePercentPoints;
  const totalRequestedFeePercentPoints = clampPercent(
    policy.venueFeePercentPoints + requestedProtocolFeePercentPoints,
  );
  const totalAllowedFeePercentPoints = policy.maxTotalFeePercentPoints;
  const capExceededByVenueFee = policy.venueFeePercentPoints > totalAllowedFeePercentPoints;
  const effectiveProtocolFeePercentPoints = clampPercent(
    Math.max(0, totalAllowedFeePercentPoints - policy.venueFeePercentPoints),
  );
  const capped =
    totalRequestedFeePercentPoints > totalAllowedFeePercentPoints || capExceededByVenueFee;
  const protocolFeePercentPoints = capped
    ? effectiveProtocolFeePercentPoints
    : requestedProtocolFeePercentPoints;
  const totalFeePercentPoints = clampPercent(
    policy.venueFeePercentPoints + protocolFeePercentPoints,
  );
  const venueFeeAmount = Number(
    ((normalizedGrossAmount * policy.venueFeePercentPoints) / 100).toFixed(8),
  );
  const protocolFeeAmount = Number(
    ((normalizedGrossAmount * protocolFeePercentPoints) / 100).toFixed(8),
  );
  const netAmount = Number(
    Math.max(0, normalizedGrossAmount - venueFeeAmount - protocolFeeAmount).toFixed(8),
  );

  return {
    grossAmount: normalizedGrossAmount,
    venueFeeAmount,
    protocolFeeAmount,
    netAmount,
    venueFeePercentPoints: policy.venueFeePercentPoints,
    requestedProtocolFeePercentPoints,
    effectiveProtocolFeePercentPoints: protocolFeePercentPoints,
    totalFeePercentPoints,
    totalFeeBps: Math.round(totalFeePercentPoints * 100),
    capped,
    capExceededByVenueFee,
    protocolFeeMode: policy.protocolFeeMode,
  };
}
