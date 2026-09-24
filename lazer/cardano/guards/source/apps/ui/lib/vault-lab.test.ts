import { describe, expect, it } from "vitest";
import { demoState } from "./demo-data";
import {
  buildBootstrapChecklist,
  buildBootstrapDraft,
  computeReferenceTargetAda,
  runScenario,
  scenarioPresets,
} from "./vault-lab";

describe("vault lab helpers", () => {
  it("computes ADA target from a reference asset price", () => {
    expect(computeReferenceTargetAda(25, 3000, 0.5)).toBe(150000);
    expect(computeReferenceTargetAda(0, 3000, 0.5)).toBe(0);
  });

  it("marks bootstrap checklist items based on draft completeness", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const ready = buildBootstrapChecklist(draft);

    expect(ready.every((item) => item.ready)).toBe(true);

    const incomplete = buildBootstrapChecklist({
      ...draft,
      governanceWallet: "",
    });
    expect(incomplete.find((item) => item.id === "governance-wallet")?.ready).toBe(
      false,
    );
  });

  it("flags invalid re-entry hysteresis in the checklist", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const checklist = buildBootstrapChecklist({
      ...draft,
      reentryDrawdownBps: draft.watchDrawdownBps + 50,
    });

    expect(checklist.find((item) => item.id === "risk-limits")?.ready).toBe(false);
  });

  it("drives the engine into full exit on the emergency scenario", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const result = runScenario(
      scenarioPresets.find((preset) => preset.id === "full-exit")!.draft,
      draft,
    );

    expect(result.assessment.nextStage).toBe("full_exit");
    expect(result.assessment.intent?.kind).toBe("derisk_swap");
  });

  it("freezes when the oracle update is stale", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const result = runScenario(
      scenarioPresets.find((preset) => preset.id === "frozen")!.draft,
      draft,
    );

    expect(result.assessment.nextStage).toBe("frozen");
    expect(result.assessment.shouldFreeze).toBe(true);
  });

  it("opens a re-entry swap when recovery conditions are satisfied", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const scenario = scenarioPresets.find((preset) => preset.id === "reentry")!.draft;
    const result = runScenario(scenario, draft);

    expect(result.assessment.intent?.kind).toBe("reentry_swap");
    expect(result.assessment.intent?.maxSellAmount).toBeLessThanOrEqual(
      scenario.stableAmount,
    );
  });

  it("keeps derisk intent sizing within holdings and slippage bounds", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const scenario = scenarioPresets.find((preset) => preset.id === "partial")!.draft;
    const result = runScenario(scenario, draft);

    expect(result.assessment.intent?.kind).toBe("derisk_swap");
    expect(result.assessment.intent?.maxSellAmount ?? 0).toBeLessThanOrEqual(
      scenario.adaAmount,
    );
    expect(result.assessment.intent?.minBuyAmount ?? 0).toBeGreaterThan(0);
  });

  it("freezes when confidence exceeds the configured guardrail", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const result = runScenario(
      {
        ...scenarioPresets.find((preset) => preset.id === "watch")!.draft,
        adaConfidence: 0.02,
      },
      draft,
    );

    expect(result.assessment.nextStage).toBe("frozen");
    expect(result.assessment.shouldFreeze).toBe(true);
  });

  it("suppresses automatic actions while cooldown is still active", () => {
    const draft = buildBootstrapDraft(demoState.policy);
    const result = runScenario(
      {
        ...scenarioPresets.find((preset) => preset.id === "partial")!.draft,
        secondsSinceLastTransition: 120,
      },
      draft,
    );

    expect(result.assessment.nextStage).toBe("watch");
    expect(result.assessment.intent).toBeUndefined();
    expect(
      result.assessment.reasons.some((reason) => reason.code === "cooldown_active"),
    ).toBe(true);
  });
});
