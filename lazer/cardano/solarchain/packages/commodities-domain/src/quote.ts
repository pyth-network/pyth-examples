import type { CommodityAgreement, CommoditySettlementQuote } from "@packages/shared-types";
import { validateAgreement } from "./validation.js";

export function buildCommoditySettlementQuote(
  agreement: CommodityAgreement,
  oraclePriceUsd: number
): CommoditySettlementQuote {
  validateAgreement(agreement);

  const effectiveSettlementPriceUsd = clamp(oraclePriceUsd, agreement.floorPriceUsd, agreement.capPriceUsd);
  const grossNotionalUsd = effectiveSettlementPriceUsd * agreement.quantity;
  const variationUsd = (effectiveSettlementPriceUsd - agreement.strikePriceUsd) * agreement.quantity;

  let payoutDirection: CommoditySettlementQuote["payoutDirection"] = "FLAT";
  if (variationUsd > 0) payoutDirection = "BUYER_TO_SELLER";
  if (variationUsd < 0) payoutDirection = "SELLER_TO_BUYER";

  return {
    agreementId: agreement.agreementId,
    oraclePriceUsd,
    effectiveSettlementPriceUsd,
    grossNotionalUsd: Number(grossNotionalUsd.toFixed(2)),
    variationUsd: Number(variationUsd.toFixed(2)),
    payoutDirection,
    createdAt: new Date().toISOString()
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
