import {
  evaluateRiskLadder,
  type TreasuryState,
} from "@anaconda/core";
import type { TickResult } from "./keeper.js";
import {
  buildDashboardPayload,
  type DashboardDemoFrame,
  type DashboardPayload,
  type DashboardSeriesPoint,
} from "./dashboard.js";
import { PythCollector } from "./collector.js";
import { buildDemoScenario, sampleWitness } from "./fixtures.js";
import { CardanoKeeperService } from "./keeper.js";
import { AuditStore } from "./storage.js";
import { buildSnapshots } from "@anaconda/core";

export interface DemoState {
  payload: DashboardPayload;
  operations: {
    partial: TickResult;
    fullExit: TickResult;
    reentry: TickResult;
  };
  counts: ReturnType<AuditStore["counts"]>;
  events: ReturnType<AuditStore["listEvents"]>;
}

function publishAll(
  collector: PythCollector,
  snapshots: Record<string, ReturnType<typeof buildSnapshots>[string]>,
) {
  for (const snapshot of Object.values(snapshots)) {
    collector.publish(snapshot);
  }
}

function reasonForFrame(result: ReturnType<typeof evaluateRiskLadder>, fallback: string): string {
  return result.reasons[0]?.message ?? fallback;
}

function point(label: string, stage: TreasuryState["stage"], valueFiat: number): DashboardSeriesPoint {
  return {
    label,
    stage,
    valueFiat,
  };
}

function frame(input: {
  label: string;
  title: string;
  copy: string;
  stage: TreasuryState["stage"];
  valueFiat: number;
  stableRatio: number;
  reason: string;
}): DashboardDemoFrame {
  return input;
}

export function createDemoState(): DemoState {
  const auditStore = new AuditStore();
  const collector = new PythCollector(auditStore);
  const keeper = new CardanoKeeperService(sampleWitness.pythPolicyId, auditStore);
  const scenario = buildDemoScenario();

  publishAll(
    collector,
    buildSnapshots({
      ada: {
        snapshotId: "snapshot-ada-watch",
        price: 75,
        emaPrice: 80,
        feedUpdateTimestampUs: 180_000_000,
        observedAtUs: 180_000_000,
      },
      usdm: {
        snapshotId: "snapshot-usdm-watch",
        feedUpdateTimestampUs: 180_000_000,
        observedAtUs: 180_000_000,
      },
    }),
  );
  let treasury = scenario.treasury;

  const baselineAssessment = evaluateRiskLadder(
    treasury,
    scenario.policy,
    collector.current(),
    scenario.routes,
    180_000_000,
  );

  publishAll(
    collector,
    buildSnapshots({
      ada: {
        snapshotId: "snapshot-ada-partial",
        price: 72,
        emaPrice: 80,
        feedUpdateTimestampUs: 200_000_000,
        observedAtUs: 200_000_000,
      },
      usdm: {
        snapshotId: "snapshot-usdm-partial",
        feedUpdateTimestampUs: 200_000_000,
        observedAtUs: 200_000_000,
      },
    }),
  );

  const partial = keeper.tick({
    treasury,
    policy: scenario.policy,
    routes: scenario.routes,
    snapshots: collector.current(),
    nowUs: 200_000_000,
    keeperId: "keeper-1",
    witness: sampleWitness,
  });
  treasury = partial.treasury;

  const partialAssessment = evaluateRiskLadder(
    treasury,
    scenario.policy,
    collector.current(),
    scenario.routes,
    200_000_000,
  );

  publishAll(
    collector,
    buildSnapshots({
      ada: {
        snapshotId: "snapshot-ada-crash",
        price: 39,
        emaPrice: 80,
        feedUpdateTimestampUs: 240_000_000,
        observedAtUs: 240_000_000,
      },
      usdm: {
        snapshotId: "snapshot-usdm-2",
        feedUpdateTimestampUs: 240_000_000,
        observedAtUs: 240_000_000,
      },
    }),
  );

  const fullExit = keeper.tick({
    treasury,
    policy: scenario.policy,
    routes: scenario.routes,
    snapshots: collector.current(),
    nowUs: 260_000_000,
    keeperId: "keeper-1",
    witness: sampleWitness,
  });
  treasury = fullExit.treasury;

  const fullExitAssessment = evaluateRiskLadder(
    treasury,
    scenario.policy,
    collector.current(),
    scenario.routes,
    260_000_000,
  );

  publishAll(
    collector,
    buildSnapshots({
      ada: {
        snapshotId: "snapshot-ada-recovery",
        price: 79,
        emaPrice: 80,
        confidence: 0.2,
        feedUpdateTimestampUs: 340_000_000,
        observedAtUs: 340_000_000,
      },
      usdm: {
        snapshotId: "snapshot-usdm-3",
        feedUpdateTimestampUs: 340_000_000,
        observedAtUs: 340_000_000,
      },
    }),
  );

  const reentry = keeper.tick({
    treasury,
    policy: scenario.policy,
    routes: scenario.routes,
    snapshots: collector.current(),
    nowUs: 360_000_000,
    keeperId: "keeper-1",
    witness: sampleWitness,
  });

  const reentryAssessment = evaluateRiskLadder(
    reentry.treasury,
    scenario.policy,
    collector.current(),
    scenario.routes,
    360_000_000,
  );

  const events = auditStore.listEvents();
  const portfolioSeries: DashboardSeriesPoint[] = [
    point("Watch", "watch", baselineAssessment.metrics.totalLiquidValueFiat),
    point("Partial", partial.treasury.stage, partialAssessment.metrics.totalLiquidValueFiat),
    point("Exit", fullExit.treasury.stage, fullExitAssessment.metrics.totalLiquidValueFiat),
    point("Recovery", reentry.treasury.stage, reentryAssessment.metrics.totalLiquidValueFiat),
  ];
  const demoFrames: DashboardDemoFrame[] = [
    frame({
      label: "01",
      title: "Watchlist breach detected",
      copy:
        "ADA slips under its EMA while Pyth freshness and confidence remain healthy enough to authorize a policy action.",
      stage: "watch",
      valueFiat: baselineAssessment.metrics.totalLiquidValueFiat,
      stableRatio: baselineAssessment.metrics.stableRatio,
      reason: reasonForFrame(
        baselineAssessment,
        "Drawdown approaches the first policy band.",
      ),
    }),
    frame({
      label: "02",
      title: "Partial de-risk executes",
      copy:
        "The keeper emits an intent, swaps only the bounded amount needed, and restores the defended stable floor.",
      stage: partial.treasury.stage,
      valueFiat: partialAssessment.metrics.totalLiquidValueFiat,
      stableRatio: partialAssessment.metrics.stableRatio,
      reason: reasonForFrame(
        partialAssessment,
        "Partial stable target restored.",
      ),
    }),
    frame({
      label: "03",
      title: "Full stable exit after the second leg down",
      copy:
        "A deeper price break and thinner asset cushion push the vault into a full defensive configuration on the approved stable route.",
      stage: fullExit.treasury.stage,
      valueFiat: fullExitAssessment.metrics.totalLiquidValueFiat,
      stableRatio: fullExitAssessment.metrics.stableRatio,
      reason: reasonForFrame(
        fullExitAssessment,
        "Emergency floor forced the full stable path.",
      ),
    }),
    frame({
      label: "04",
      title: "Auto re-entry restores exposure",
      copy:
        "Recovery clears the hysteresis band, cooldown expires, and the treasury re-enters risk according to the configured target ratio.",
      stage: reentry.treasury.stage,
      valueFiat: reentryAssessment.metrics.totalLiquidValueFiat,
      stableRatio: reentryAssessment.metrics.stableRatio,
      reason: reasonForFrame(
        reentryAssessment,
        "Recovery cleared the re-entry guardrails.",
      ),
    }),
  ];

  const payload = buildDashboardPayload({
    treasury: reentry.treasury,
    policy: scenario.policy,
    routes: scenario.routes,
    snapshots: collector.current(),
    operations: [partial, fullExit, reentry],
    events,
    nowUs: 360_000_000,
    portfolioSeries,
    demoFrames,
  });

  return {
    payload,
    operations: {
      partial,
      fullExit,
      reentry,
    },
    counts: auditStore.counts(),
    events,
  };
}
