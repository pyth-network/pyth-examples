import type { CommodityAgreement, CommodityAgreementInput, OracleObservation } from "@packages/shared-types";
import { CommodityDomainError } from "./errors.js";

export function normalizeAgreement(input: CommodityAgreementInput, now = new Date()): CommodityAgreement {
  const agreement: CommodityAgreement = {
    agreementId: input.agreementId.trim(),
    commodity: input.commodity,
    buyerAddress: input.buyerAddress.trim(),
    sellerAddress: input.sellerAddress.trim(),
    quantity: input.quantity,
    unit: input.unit,
    referencePriceFeedId: input.referencePriceFeedId,
    strikePriceUsd: input.strikePriceUsd,
    floorPriceUsd: input.floorPriceUsd,
    capPriceUsd: input.capPriceUsd,
    expiresAt: new Date(input.expiresAt).toISOString(),
    collateralAda: toBigInt(input.collateralAda)
  };

  validateAgreement(agreement, now);
  return agreement;
}

export function validateAgreement(agreement: CommodityAgreement, now = new Date()): void {
  if (!agreement.agreementId) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "agreementId es obligatorio");
  }

  if (!looksLikeCardanoAddress(agreement.buyerAddress) || !looksLikeCardanoAddress(agreement.sellerAddress)) {
    throw new CommodityDomainError(
      "INVALID_AGREEMENT",
      "buyerAddress y sellerAddress deben parecer direcciones Cardano válidas",
      { buyerAddress: agreement.buyerAddress, sellerAddress: agreement.sellerAddress }
    );
  }

  if (agreement.buyerAddress === agreement.sellerAddress) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "buyerAddress y sellerAddress no pueden ser iguales");
  }

  if (!Number.isFinite(agreement.quantity) || agreement.quantity <= 0) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "quantity debe ser > 0", { quantity: agreement.quantity });
  }

  if (!Number.isInteger(agreement.referencePriceFeedId) || agreement.referencePriceFeedId <= 0) {
    throw new CommodityDomainError(
      "INVALID_AGREEMENT",
      "referencePriceFeedId debe ser un entero positivo",
      { referencePriceFeedId: agreement.referencePriceFeedId }
    );
  }

  if (
    !Number.isFinite(agreement.floorPriceUsd) ||
    !Number.isFinite(agreement.strikePriceUsd) ||
    !Number.isFinite(agreement.capPriceUsd) ||
    agreement.floorPriceUsd <= 0 ||
    agreement.strikePriceUsd <= 0 ||
    agreement.capPriceUsd <= 0
  ) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "floorPriceUsd, strikePriceUsd y capPriceUsd deben ser > 0");
  }

  if (agreement.floorPriceUsd > agreement.capPriceUsd) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "floorPriceUsd no puede ser mayor a capPriceUsd");
  }

  if (agreement.strikePriceUsd < agreement.floorPriceUsd || agreement.strikePriceUsd > agreement.capPriceUsd) {
    throw new CommodityDomainError(
      "INVALID_AGREEMENT",
      "strikePriceUsd debe quedar dentro del rango [floorPriceUsd, capPriceUsd]",
      {
        strikePriceUsd: agreement.strikePriceUsd,
        floorPriceUsd: agreement.floorPriceUsd,
        capPriceUsd: agreement.capPriceUsd
      }
    );
  }

  const expiryTime = Date.parse(agreement.expiresAt);
  if (Number.isNaN(expiryTime)) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "expiresAt no es una fecha ISO válida", {
      expiresAt: agreement.expiresAt
    });
  }

  if (expiryTime <= now.getTime()) {
    throw new CommodityDomainError("EXPIRED_AGREEMENT", "El acuerdo ya está vencido", {
      expiresAt: agreement.expiresAt,
      now: now.toISOString()
    });
  }

  if (agreement.collateralAda <= 0n) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "collateralAda debe ser > 0", {
      collateralAda: agreement.collateralAda.toString()
    });
  }
}

export function validateOracleObservation(observation: OracleObservation): void {
  if (!Number.isFinite(observation.priceUsd) || observation.priceUsd <= 0) {
    throw new CommodityDomainError("INVALID_ORACLE", "El precio del oracle debe ser > 0", {
      priceUsd: observation.priceUsd,
      source: observation.source
    });
  }

  const asOfTime = Date.parse(observation.asOf);
  if (Number.isNaN(asOfTime)) {
    throw new CommodityDomainError("INVALID_ORACLE", "oracle.asOf no es una fecha ISO válida", {
      asOf: observation.asOf,
      source: observation.source
    });
  }
}

function looksLikeCardanoAddress(value: string): boolean {
  return value.startsWith("addr") && value.length >= 20;
}

function toBigInt(value: string | number | bigint): bigint {
  try {
    if (typeof value === "bigint") {
      return value;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new Error("number collateralAda debe ser entero");
      }
      return BigInt(value);
    }

    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new Error("string collateralAda debe contener sólo dígitos");
    }

    return BigInt(normalized);
  } catch (error) {
    throw new CommodityDomainError("INVALID_AGREEMENT", "collateralAda no pudo convertirse a bigint", {
      value: String(value),
      reason: error instanceof Error ? error.message : "unknown"
    });
  }
}
