import { describe, expect, it } from "vitest";
import {
  applyRevenueFees,
  buildProtocolFeePolicy,
  getConfiguredVenueFeePercent,
  resolveProtocolFeeMode,
} from "../src/protocol-fee.js";
import { buildCardanoSwapVenueConfig } from "../src/swap-venue.js";

describe("protocol fee model", () => {
  it("defaults unknown modes to explicit output", () => {
    expect(resolveProtocolFeeMode("something-else")).toBe("explicit_output");
    expect(resolveProtocolFeeMode("none")).toBe("none");
    expect(resolveProtocolFeeMode("post_swap_reconciliation")).toBe(
      "post_swap_reconciliation",
    );
  });

  it("reads configured venue fee from dexhunter", () => {
    const config = buildCardanoSwapVenueConfig({
      provider: "dexhunter",
      protocolFeeBps: 30,
      dexHunterBaseUrl: "https://api-us.dexhunterv3.app",
      dexHunterPartnerId: "partner-123",
      dexHunterPartnerFeePercent: 0.3,
      minswapAggregatorUrl: "https://agg-api.minswap.org/aggregator",
      minswapPartnerCode: "guards-one",
    });

    expect(getConfiguredVenueFeePercent(config)).toBe(0.3);
  });

  it("applies venue fee plus protocol fee when within cap", () => {
    const breakdown = applyRevenueFees(
      1_000,
      buildProtocolFeePolicy({
        provider: "dexhunter",
        venueFeePercent: 0.3,
        protocolFeeBps: 70,
        maxTotalFeeBps: 100,
        protocolFeeMode: "explicit_output",
      }),
    );

    expect(breakdown.venueFeeAmount).toBe(3);
    expect(breakdown.protocolFeeAmount).toBe(7);
    expect(breakdown.netAmount).toBe(990);
    expect(breakdown.totalFeeBps).toBe(100);
    expect(breakdown.totalFeePercentPoints).toBe(1);
    expect(breakdown.capped).toBe(false);
  });

  it("caps protocol fee when venue fee plus protocol fee exceed the max", () => {
    const breakdown = applyRevenueFees(
      1_000,
      buildProtocolFeePolicy({
        provider: "dexhunter",
        venueFeePercent: 0.45,
        protocolFeeBps: 80,
        maxTotalFeeBps: 100,
        protocolFeeMode: "explicit_output",
      }),
    );

    expect(breakdown.requestedProtocolFeePercentPoints).toBe(0.8);
    expect(breakdown.effectiveProtocolFeePercentPoints).toBe(0.55);
    expect(breakdown.protocolFeeAmount).toBe(5.5);
    expect(breakdown.totalFeeBps).toBe(100);
    expect(breakdown.capped).toBe(true);
  });


  it("flags when the venue fee alone exceeds the cap", () => {
    const breakdown = applyRevenueFees(
      1_000,
      buildProtocolFeePolicy({
        provider: "dexhunter",
        venueFeePercent: 1.2,
        protocolFeeBps: 20,
        maxTotalFeeBps: 100,
        protocolFeeMode: "explicit_output",
      }),
    );

    expect(breakdown.capExceededByVenueFee).toBe(true);
    expect(breakdown.effectiveProtocolFeePercentPoints).toBe(0);
    expect(breakdown.totalFeeBps).toBe(120);
    expect(breakdown.capped).toBe(true);
  });

  it("disables protocol fee when the mode is none", () => {
    const breakdown = applyRevenueFees(
      500,
      buildProtocolFeePolicy({
        provider: "minswap",
        venueFeePercent: 0,
        protocolFeeBps: 90,
        maxTotalFeeBps: 100,
        protocolFeeMode: "none",
      }),
    );

    expect(breakdown.protocolFeeAmount).toBe(0);
    expect(breakdown.totalFeeBps).toBe(0);
  });
});
