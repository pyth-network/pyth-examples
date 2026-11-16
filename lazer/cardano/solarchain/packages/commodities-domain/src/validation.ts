import type { CommodityAgreement } from "@packages/shared-types";

export function validateAgreement(agreement: CommodityAgreement): void {
  if (agreement.floorPriceUsd > agreement.capPriceUsd) {
    throw new Error("floorPriceUsd no puede ser mayor a capPriceUsd");
  }

  if (agreement.quantity <= 0) {
    throw new Error("quantity debe ser > 0");
  }

  if (!agreement.buyerAddress.startsWith("addr") || !agreement.sellerAddress.startsWith("addr")) {
    throw new Error("buyerAddress/sellerAddress no parecen direcciones Cardano válidas");
  }
}
