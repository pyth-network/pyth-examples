import { fetchSignedPriceUpdate } from "@packages/pyth-adapter";
import { buildOracleObservation } from "@packages/commodities-domain";
import type { CommodityOracleResolution, CommodityQuoteRequest } from "@packages/shared-types";

export async function resolveCommodityOracle(request: CommodityQuoteRequest): Promise<CommodityOracleResolution> {
  const maxAgeSeconds = request.maxOracleAgeSeconds ?? 900;
  let primarySignedUpdate: CommodityOracleResolution["primarySignedUpdate"];
  let primaryStatus: CommodityOracleResolution["primaryStatus"] = "UNAVAILABLE";
  let primaryReason = "Pyth signed payload no disponible";

  try {
    primarySignedUpdate = await fetchSignedPriceUpdate(request.agreement.referencePriceFeedId);
    primaryStatus = "AVAILABLE";
    primaryReason = "Pyth signed payload disponible, pero el valor numérico sigue mockeado para la demo";
  } catch (error) {
    primaryReason = error instanceof Error ? error.message : "unknown pyth error";
  }

  if (request.demoOraclePriceUsd === undefined) {
    return {
      settlement: {
        source: "DEMO_SECONDARY",
        priceUsd: 0,
        asOf: new Date().toISOString(),
        freshnessSeconds: 0,
        maxAgeSeconds,
        status: "DISPUTED",
        reason: "Falta demoOraclePriceUsd y el MVP no parsea todavía el precio numérico de Pyth"
      },
      fallbackUsed: false,
      primaryStatus,
      primaryReason,
      primarySignedUpdate
    };
  }

  const settlement = buildOracleObservation({
    source: "DEMO_SECONDARY",
    priceUsd: request.demoOraclePriceUsd,
    asOf: request.demoOracleAsOf,
    maxAgeSeconds,
    reason:
      primaryStatus === "AVAILABLE"
        ? "Settlement usa demo secondary numeric price con signed payload de Pyth adjunto"
        : "Settlement usa demo secondary numeric price por indisponibilidad del payload primario"
  });

  if (settlement.status === "STALE") {
    settlement.status = request.allowDemoFallback ? "OK" : "DISPUTED";
    settlement.reason = request.allowDemoFallback
      ? "Demo fallback permitido aunque el precio secundario está vencido"
      : "El precio secundario está vencido y el acuerdo debe ir a dispute/fallback";
  }

  return {
    settlement,
    fallbackUsed: true,
    primaryStatus,
    primaryReason,
    primarySignedUpdate
  };
}
