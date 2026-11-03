import type { OracleDatum, ActionDecision, DecisionConfig } from "@/types";

export function buildDatumFromConfig(config: DecisionConfig): OracleDatum {
  switch (config.datumKind) {
    case "AnyPrice":
      return { kind: "AnyPrice" };
    case "MinPrice":
      return { kind: "MinPrice", minPriceUsdCents: config.minPriceUsdCents };
    case "MaxPrice":
      return { kind: "MaxPrice", maxPriceUsdCents: config.maxPriceUsdCents };
    case "PriceRange":
      return {
        kind: "PriceRange",
        loCents: config.minPriceUsdCents,
        hiCents: config.maxPriceUsdCents,
      };
  }
}

export function decide(
  priceUsdCents: number,
  timestamp: number,
  datum: OracleDatum,
  maxAgeSeconds: number,
): ActionDecision {
  const ageMs = Date.now() - timestamp;
  const ageSec = Math.floor(ageMs / 1000);

  if (ageSec > maxAgeSeconds) {
    return {
      action: "block",
      reason: `Price stale: ${ageSec}s old (max ${maxAgeSeconds}s)`,
    };
  }

  const centsDisplay = (priceUsdCents / 100).toFixed(2);

  switch (datum.kind) {
    case "AnyPrice":
      return {
        action: "spend",
        reason: `AnyPrice — $${centsDisplay} accepted`,
      };

    case "MinPrice":
      if (priceUsdCents >= datum.minPriceUsdCents) {
        return {
          action: "spend",
          reason: `$${centsDisplay} >= min $${(datum.minPriceUsdCents / 100).toFixed(2)}`,
        };
      }
      return {
        action: "lock",
        reason: `$${centsDisplay} < min $${(datum.minPriceUsdCents / 100).toFixed(2)}`,
      };

    case "MaxPrice":
      if (priceUsdCents <= datum.maxPriceUsdCents) {
        return {
          action: "spend",
          reason: `$${centsDisplay} <= max $${(datum.maxPriceUsdCents / 100).toFixed(2)}`,
        };
      }
      return {
        action: "lock",
        reason: `$${centsDisplay} > max $${(datum.maxPriceUsdCents / 100).toFixed(2)}`,
      };

    case "PriceRange":
      if (priceUsdCents >= datum.loCents && priceUsdCents <= datum.hiCents) {
        return {
          action: "spend",
          reason: `$${centsDisplay} in [$${(datum.loCents / 100).toFixed(2)}, $${(datum.hiCents / 100).toFixed(2)}]`,
        };
      }
      return {
        action: "lock",
        reason: `$${centsDisplay} outside [$${(datum.loCents / 100).toFixed(2)}, $${(datum.hiCents / 100).toFixed(2)}]`,
      };
  }
}
