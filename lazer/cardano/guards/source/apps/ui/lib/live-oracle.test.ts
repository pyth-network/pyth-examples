import { describe, expect, it } from "vitest";
import { demoState } from "./demo-data";
import { applyLiveOracleToDemoState } from "./live-oracle";
import type { DemoState, OracleSnapshot } from "./types";

const oracle: OracleSnapshot = {
  feedId: "pyth-ada-usd",
  symbol: "ADA/USD",
  price: 0.25,
  emaPrice: 0.3,
  confidence: 0.001,
  updatedAtMs: Date.parse("2026-03-22T19:00:00.000Z"),
  publisherCount: 10,
};

describe("applyLiveOracleToDemoState", () => {
  it("revalues the risk position and portfolio metrics using the live oracle", () => {
    const state = applyLiveOracleToDemoState(demoState, oracle);

    const riskPosition = state.positions.find((position) => position.role === "risk");
    const stablePosition = state.positions.find((position) => position.role === "stable");

    expect(riskPosition?.fiatValue).toBeCloseTo(31_250, 6);
    expect(stablePosition?.fiatValue).toBe(37_500);
    expect(state.metrics.liquidValue).toBeCloseTo(68_281.25, 6);
    expect(state.metrics.stableRatio).toBeCloseTo(37_500 / 68_281.25, 6);
    expect(state.metrics.drawdownBps).toBe(1667);
    expect(riskPosition?.weight).toBeCloseTo(31_250 / 68_750, 6);
    expect(stablePosition?.weight).toBeCloseTo(37_500 / 68_750, 6);
  });

  it("preserves fallback weights when total display value is zero", () => {
    const zeroState: DemoState = {
      ...demoState,
      positions: demoState.positions.map((position) =>
        position.role === "risk"
          ? { ...position, amount: 0, fiatValue: 0, weight: 0 }
          : { ...position, fiatValue: 0, weight: 0 },
      ),
    };

    const state = applyLiveOracleToDemoState(zeroState, oracle);

    expect(state.metrics.liquidValue).toBe(0);
    expect(state.metrics.stableRatio).toBe(0);
    expect(state.positions.every((position) => position.weight === 0)).toBe(true);
  });

  it("still updates oracle metrics when the risk position is missing", () => {
    const stateWithoutRisk: DemoState = {
      ...demoState,
      positions: demoState.positions.filter((position) => position.role !== "risk"),
    };

    const state = applyLiveOracleToDemoState(stateWithoutRisk, oracle);

    expect(state.oracle.price).toBe(oracle.price);
    expect(state.metrics.drawdownBps).toBe(1667);
    expect(state.metrics.oracleFreshness).toMatch(/ago$/);
  });
});
