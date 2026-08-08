import type { CommodityAgreement, CommoditySettlementQuote, OracleObservation } from "@packages/shared-types";
import { CommodityDomainError } from "./errors.js";
import { validateAgreement, validateOracleObservation } from "./validation.js";

export interface SettlementComputationInput {
  agreement: CommodityAgreement;
  oracle: OracleObservation;
  demoAdaUsdFx?: number;
}

export function buildCommoditySettlementQuote(input: SettlementComputationInput): CommoditySettlementQuote {
  const { agreement, oracle } = input;
  const demoAdaUsdFx = input.demoAdaUsdFx ?? 1;

  validateAgreement(agreement);
  validateOracleObservation(oracle);

  if (!Number.isFinite(demoAdaUsdFx) || demoAdaUsdFx <= 0) {
    throw new CommodityDomainError("INVALID_ORACLE", "demoAdaUsdFx debe ser > 0", { demoAdaUsdFx });
  }

  const settlementPriceUsd = clamp(oracle.priceUsd, agreement.floorPriceUsd, agreement.capPriceUsd);
  const variationUsd = roundUsd((settlementPriceUsd - agreement.strikePriceUsd) * agreement.quantity);
  const maxExposureUsd = roundUsd(computeMaxExposureUsd(agreement));
  const requiredCollateralAda = usdToLovelace(maxExposureUsd, demoAdaUsdFx);

  let payoutDirection: CommoditySettlementQuote["payoutDirection"] = "FLAT";
  if (variationUsd > 0) payoutDirection = "BUYER_TO_SELLER";
  if (variationUsd < 0) payoutDirection = "SELLER_TO_BUYER";

  return {
    agreementId: agreement.agreementId,
    commodity: agreement.commodity,
    quantity: agreement.quantity,
    unit: agreement.unit,
    strikePriceUsd: agreement.strikePriceUsd,
    floorPriceUsd: agreement.floorPriceUsd,
    capPriceUsd: agreement.capPriceUsd,
    oraclePriceUsd: roundUsd(oracle.priceUsd),
    settlementPriceUsd: roundUsd(settlementPriceUsd),
    variationUsd,
    payoutDirection,
    maxExposureUsd,
    requiredCollateralAda,
    collateralAda: agreement.collateralAda,
    collateralizationStatus: agreement.collateralAda >= requiredCollateralAda ? "SUFFICIENT" : "INSUFFICIENT",
    createdAt: new Date().toISOString(),
    expiresAt: agreement.expiresAt,
    demoAdaUsdFx
  };
}

export function isOracleUsableForSettlement(observation: OracleObservation): boolean {
  return observation.status === "OK";
}

export function buildOracleObservation(params: {
  source: OracleObservation["source"];
  priceUsd: number;
  asOf?: string;
  maxAgeSeconds: number;
  now?: Date;
  reason?: string;
}): OracleObservation {
  const now = params.now ?? new Date();
  const asOf = params.asOf ? new Date(params.asOf) : now;

  if (Number.isNaN(asOf.getTime())) {
    throw new CommodityDomainError("INVALID_ORACLE", "oracle.asOf no es una fecha ISO válida", {
      asOf: params.asOf,
      source: params.source
    });
  }

  const freshnessSeconds = Math.max(0, Math.floor((now.getTime() - asOf.getTime()) / 1000));
  const status = freshnessSeconds > params.maxAgeSeconds ? "STALE" : "OK";

  return {
    source: params.source,
    priceUsd: roundUsd(params.priceUsd),
    asOf: asOf.toISOString(),
    freshnessSeconds,
    maxAgeSeconds: params.maxAgeSeconds,
    status,
    reason: params.reason
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeMaxExposureUsd(agreement: CommodityAgreement): number {
  const upperMove = Math.abs(agreement.capPriceUsd - agreement.strikePriceUsd) * agreement.quantity;
  const lowerMove = Math.abs(agreement.floorPriceUsd - agreement.strikePriceUsd) * agreement.quantity;
  return Math.max(upperMove, lowerMove);
}

function usdToLovelace(usdAmount: number, adaUsdFx: number): bigint {
  return BigInt(Math.ceil((usdAmount / adaUsdFx) * 1_000_000));
}

function roundUsd(value: number): number {
  return Number(value.toFixed(2));
}
