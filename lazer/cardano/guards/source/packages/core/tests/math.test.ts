import { describe, expect, it } from "vitest";
import {
  applyHaircut,
  buildSnapshots,
  computeDrawdownBps,
  confidenceBps,
  samplePolicy,
  sampleTreasury,
  summarizePortfolio,
  toDecimalEma,
  toDecimalPrice,
} from "../src/index.js";

describe("core math helpers", () => {
  it("converts Pyth values into decimal price and ema", () => {
    const snapshots = buildSnapshots();
    expect(toDecimalPrice(snapshots.ada!)).toBe(0.72);
    expect(toDecimalEma(snapshots.ada!)).toBe(0.8);
  });

  it("computes relative confidence in bps", () => {
    const snapshots = buildSnapshots();
    expect(confidenceBps(snapshots.ada!)).toBeCloseTo(55.5555, 2);
  });

  it("computes drawdown only when price is below ema", () => {
    const snapshots = buildSnapshots();
    expect(computeDrawdownBps(snapshots.ada!)).toBeCloseTo(1000, 4);
    expect(
      computeDrawdownBps({
        ...snapshots.ada!,
        price: 81,
      }),
    ).toBe(0);
  });

  it("applies the configured haircut", () => {
    expect(applyHaircut(100, 300)).toBe(97);
  });

  it("summarizes liquid portfolio values and ratios", () => {
    const metrics = summarizePortfolio(
      sampleTreasury.positions,
      buildSnapshots(),
      samplePolicy,
    );

    expect(metrics.totalLiquidValueFiat).toBeCloseTo(8484, 2);
    expect(metrics.riskLiquidValueFiat).toBeCloseTo(6984, 2);
    expect(metrics.stableLiquidValueFiat).toBe(1500);
    expect(metrics.stableRatio).toBeCloseTo(0.1768, 3);
  });

  it("values stable assets using the oracle price when a depeg is present", () => {
    const metrics = summarizePortfolio(
      sampleTreasury.positions,
      buildSnapshots({
        usdm: {
          price: 970_000,
          emaPrice: 990_000,
          snapshotId: "snapshot-usdm-depeg",
        },
      }),
      samplePolicy,
    );

    expect(metrics.stableLiquidValueFiat).toBe(1455);
    expect(metrics.totalLiquidValueFiat).toBeCloseTo(8439, 2);
    expect(metrics.stableRatio).toBeCloseTo(1455 / 8439, 4);
  });
});
