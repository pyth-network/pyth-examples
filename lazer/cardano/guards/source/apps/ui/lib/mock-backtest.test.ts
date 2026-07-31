import { describe, expect, it } from "vitest";
import { buildBootstrapDraft } from "./vault-lab";
import { demoState } from "./demo-data";
import { runMockBacktest } from "./mock-backtest";

describe("runMockBacktest", () => {
  const draft = buildBootstrapDraft(demoState.policy);

  it("builds a 7d series with 15 minute steps", () => {
    const result = runMockBacktest(draft, {
      strategy: "guards_ladder",
      days: 7,
      intervalMinutes: 15,
    });

    expect(result.points).toHaveLength(672);
    expect(result.summary.pointCount).toBe(672);
  });

  it("emits at least one execution for guards ladder", () => {
    const result = runMockBacktest(draft, {
      strategy: "guards_ladder",
    });

    expect(result.executions.length).toBeGreaterThan(0);
    expect(result.summary.minLiquidValueFiat).toBeGreaterThan(0);
  });

  it("keeps XAU target strategy within a valid stage set", () => {
    const result = runMockBacktest(draft, {
      strategy: "xau_target",
    });

    expect(["normal", "watch", "partial_derisk", "full_exit", "frozen"]).toContain(
      result.summary.finalStage,
    );
  });

  it("keeps floor defender passive when only drawdown noise is present", () => {
    const result = runMockBacktest(draft, {
      strategy: "floor_defender",
      dataset: "ada_treasury_base",
      days: 1,
      intervalMinutes: 15,
    });

    expect(result.executions).toHaveLength(0);
    expect(["watch", "frozen"]).toContain(result.summary.finalStage);
  });

  it("replays deterministically across runs", () => {
    const first = runMockBacktest(draft, {
      strategy: "guards_ladder",
      dataset: "ada_flash_crash",
    });
    const second = runMockBacktest(draft, {
      strategy: "guards_ladder",
      dataset: "ada_flash_crash",
    });

    expect(first.points).toEqual(second.points);
    expect(first.executions).toEqual(second.executions);
  });

  it("buys ADA when XAU target drift leaves the treasury underweight", () => {
    const result = runMockBacktest(draft, {
      strategy: "xau_target",
      dataset: "xau_rotation",
    });

    const firstExecution = result.executions[0];
    expect(firstExecution).toBeDefined();
    expect(firstExecution?.kind).toBe("reentry_swap");
    expect(firstExecution?.sourceSymbol).toBe("USDM");
    expect(firstExecution?.destinationSymbol).toBe("ADA");
  });
});
