import { runtimeEnv } from "./env.js";

export type CardanoSwapProvider = "dexhunter" | "minswap";

const MAX_FEE_BPS = 10_000;
const MAX_PERCENT_POINTS = 100;

export interface CardanoSwapVenueConfig {
  provider: CardanoSwapProvider;
  protocolFeeBps: number;
  protocolFeePercentPoints: number;
  protocolFeeRate: number;
  dexHunter: {
    baseUrl: string;
    partnerId: string;
    partnerFeePercentPoints: number;
    partnerFeeRate: number;
    requiresPartnerHeader: boolean;
  };
  minswap: {
    aggregatorUrl: string;
    partnerCode: string;
    supportsPartnerTracking: boolean;
  };
}

export function resolveCardanoSwapProvider(value: string): CardanoSwapProvider {
  const normalized = value.trim().toLowerCase();
  return normalized === "minswap" ? "minswap" : "dexhunter";
}

function clampBps(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_FEE_BPS, Math.max(0, Math.round(value)));
}

function clampPercentPoints(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_PERCENT_POINTS, Math.max(0, Number(value.toFixed(4))));
}

export function feeBpsToPercentPoints(bps: number): number {
  return clampBps(bps) / 100;
}

export function feeBpsToRate(bps: number): number {
  return clampBps(bps) / 10_000;
}

export function buildCardanoSwapVenueConfig(input: {
  provider: string;
  protocolFeeBps: number;
  dexHunterBaseUrl: string;
  dexHunterPartnerId: string;
  dexHunterPartnerFeePercent: number;
  minswapAggregatorUrl: string;
  minswapPartnerCode: string;
}): CardanoSwapVenueConfig {
  const protocolFeeBps = clampBps(input.protocolFeeBps);
  const dexHunterPartnerFeePercentPoints = clampPercentPoints(
    input.dexHunterPartnerFeePercent,
  );

  return {
    provider: resolveCardanoSwapProvider(input.provider),
    protocolFeeBps,
    protocolFeePercentPoints: feeBpsToPercentPoints(protocolFeeBps),
    protocolFeeRate: feeBpsToRate(protocolFeeBps),
    dexHunter: {
      baseUrl: input.dexHunterBaseUrl,
      partnerId: input.dexHunterPartnerId,
      partnerFeePercentPoints: dexHunterPartnerFeePercentPoints,
      partnerFeeRate: dexHunterPartnerFeePercentPoints / 100,
      requiresPartnerHeader: input.dexHunterPartnerId.length > 0,
    },
    minswap: {
      aggregatorUrl: input.minswapAggregatorUrl,
      partnerCode: input.minswapPartnerCode,
      supportsPartnerTracking: input.minswapPartnerCode.length > 0,
    },
  };
}

export function getCardanoSwapVenueConfig(): CardanoSwapVenueConfig {
  return buildCardanoSwapVenueConfig({
    provider: runtimeEnv.cardanoSwapProvider,
    protocolFeeBps: runtimeEnv.cardanoProtocolFeeBps,
    dexHunterBaseUrl: runtimeEnv.dexHunterBaseUrl,
    dexHunterPartnerId: runtimeEnv.dexHunterPartnerId,
    dexHunterPartnerFeePercent: runtimeEnv.dexHunterPartnerFeePercent,
    minswapAggregatorUrl: runtimeEnv.minswapAggregatorUrl,
    minswapPartnerCode: runtimeEnv.minswapPartnerCode,
  });
}
