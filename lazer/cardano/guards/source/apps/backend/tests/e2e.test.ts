import { describe, expect, it } from "vitest";
import { buildSnapshots } from "@anaconda/core";
import { PythCollector } from "../src/collector.js";
import { createDemoState } from "../src/demo-state.js";
import { buildDemoScenario, sampleWitness } from "../src/fixtures.js";
import { CardanoKeeperService } from "../src/keeper.js";
import { AuditStore } from "../src/storage.js";

describe("backend e2e flow", () => {
  it("runs partial de-risk, full exit, reentry and records an audit trail", () => {
    const state = createDemoState();
    const { partial, fullExit, reentry } = state.operations;

    expect(partial.stage).toBe("partial_derisk");
    expect(partial.txHash).toBeDefined();
    expect(fullExit.stage).toBe("full_exit");
    expect(fullExit.txHash).toBeDefined();
    expect(reentry.stage).toBe("normal");
    expect(reentry.txHash).toBeDefined();
    expect(state.counts.snapshots).toBeGreaterThanOrEqual(6);
    expect(state.counts.intents).toBe(3);
    expect(state.counts.executions).toBe(3);
    expect(state.counts.events).toBeGreaterThanOrEqual(9);
  });

  it("records a rejection when oracle freshness is invalid", () => {
    const scenario = buildDemoScenario();
    const auditStore = new AuditStore();
    const collector = new PythCollector(auditStore);
    const keeper = new CardanoKeeperService(sampleWitness.pythPolicyId, auditStore);

    for (const snapshot of Object.values(
      buildSnapshots({
        ada: {
          snapshotId: "snapshot-ada-stale",
          feedUpdateTimestampUs: 1_000_000,
          observedAtUs: 1_000_000,
        },
      }),
    )) {
      collector.publish(snapshot);
    }

    const result = keeper.tick({
      treasury: scenario.treasury,
      policy: scenario.policy,
      routes: scenario.routes,
      snapshots: collector.current(),
      nowUs: 500_000_000,
      keeperId: "keeper-1",
      witness: sampleWitness,
    });

    expect(result.rejected).toBe("STALE_FEED");
    expect(auditStore.counts().events).toBeGreaterThanOrEqual(3);
  });

  it("records a rejection when no approved route exists for execution", () => {
    const scenario = buildDemoScenario();
    const auditStore = new AuditStore();
    const collector = new PythCollector(auditStore);
    const keeper = new CardanoKeeperService(sampleWitness.pythPolicyId, auditStore);

    for (const snapshot of Object.values(scenario.snapshots)) {
      collector.publish(snapshot);
    }

    const result = keeper.tick({
      treasury: scenario.treasury,
      policy: {
        ...scenario.policy,
        approvedRouteIds: [],
      },
      routes: scenario.routes,
      snapshots: collector.current(),
      nowUs: 200_000_000,
      keeperId: "keeper-1",
      witness: sampleWitness,
    });

    expect(result.rejected).toBe("NO_EXECUTABLE_INTENT");
  });
});
