import { describe, expect, it } from "vitest";
import { createDemoState } from "../src/demo-state.js";

describe("dashboard payload", () => {
  it("builds a UI payload from the simulated backend state", () => {
    const state = createDemoState();

    expect(state.payload.source).toBe("backend-demo");
    expect(state.payload.workspace.name).toContain("Treasury");
    expect(state.payload.topbarChips).toHaveLength(3);
    expect(state.payload.heroMetrics).toHaveLength(4);
    expect(state.payload.dashboardCards).toHaveLength(4);
    expect(state.payload.chainCards).toHaveLength(3);
    expect(state.payload.accounts).toHaveLength(2);
    expect(state.payload.portfolioSeries).toHaveLength(4);
    expect(state.payload.demoFrames).toHaveLength(4);
    expect(state.payload.executionTimeline).toHaveLength(3);
    expect(state.payload.auditTrail.length).toBeGreaterThan(0);
    expect(state.operations.reentry.stage).toBe("normal");
  });
});
