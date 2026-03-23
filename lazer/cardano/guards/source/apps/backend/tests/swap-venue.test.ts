import { describe, expect, it } from "vitest";
import {
  buildCardanoSwapVenueConfig,
  feeBpsToPercentPoints,
  feeBpsToRate,
  resolveCardanoSwapProvider,
} from "../src/swap-venue.js";

describe("swap venue config", () => {
  it("normalizes provider values and defaults unknown providers to dexhunter", () => {
    expect(resolveCardanoSwapProvider("something-else")).toBe("dexhunter");
    expect(resolveCardanoSwapProvider("dexhunter")).toBe("dexhunter");
    expect(resolveCardanoSwapProvider("minswap")).toBe("minswap");
    expect(resolveCardanoSwapProvider(" MINSWAP ")).toBe("minswap");
  });

  it("normalizes fee bps to percent points and rate", () => {
    expect(feeBpsToPercentPoints(30)).toBe(0.3);
    expect(feeBpsToRate(30)).toBe(0.003);
    expect(feeBpsToPercentPoints(0)).toBe(0);
    expect(feeBpsToPercentPoints(-10)).toBe(0);
    expect(feeBpsToPercentPoints(Number.NaN)).toBe(0);
    expect(feeBpsToPercentPoints(20_000)).toBe(100);
  });

  it("builds venue config with bounded partner metadata", () => {
    const config = buildCardanoSwapVenueConfig({
      provider: " MINSWAP ",
      protocolFeeBps: 45,
      dexHunterBaseUrl: "https://api-us.dexhunterv3.app",
      dexHunterPartnerId: "partner-123",
      dexHunterPartnerFeePercent: Number.NaN,
      minswapAggregatorUrl: "https://agg-api.minswap.org/aggregator",
      minswapPartnerCode: "guards-one",
    });

    expect(config.provider).toBe("minswap");
    expect(config.protocolFeeBps).toBe(45);
    expect(config.protocolFeePercentPoints).toBe(0.45);
    expect(config.protocolFeeRate).toBe(0.0045);
    expect(config.dexHunter.requiresPartnerHeader).toBe(true);
    expect(config.dexHunter.partnerFeePercentPoints).toBe(0);
    expect(config.dexHunter.partnerFeeRate).toBe(0);
    expect(config.minswap.supportsPartnerTracking).toBe(true);
  });
});
