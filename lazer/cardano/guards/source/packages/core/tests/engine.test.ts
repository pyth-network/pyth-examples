import { describe, expect, it } from "vitest";
import {
  buildSnapshots,
  evaluateRiskLadder,
  samplePolicy,
  sampleRoutes,
  sampleTreasury,
} from "../src/index.js";

describe("core risk ladder", () => {
  it("computes partial de-risk when drawdown breaches the medium band", () => {
    const assessment = evaluateRiskLadder(
      sampleTreasury,
      samplePolicy,
      buildSnapshots(),
      sampleRoutes,
      100_000_000,
    );

    expect(assessment.nextStage).toBe("partial_derisk");
    expect(assessment.intent?.kind).toBe("derisk_swap");
    expect(assessment.intent?.maxSellAmount).toBeGreaterThan(0);
  });

  it("promotes to full exit on emergency floor breach", () => {
    const treasury = {
      ...sampleTreasury,
      positions: sampleTreasury.positions.map((position) =>
        position.assetId === "usdm" ? { ...position, amount: 300 } : position,
      ),
    };
    const snapshots = buildSnapshots({
      ada: { price: 42, emaPrice: 80, snapshotId: "snapshot-ada-2" },
    });

    const assessment = evaluateRiskLadder(
      treasury,
      samplePolicy,
      snapshots,
      sampleRoutes,
      100_000_000,
    );

    expect(assessment.nextStage).toBe("full_exit");
    expect(assessment.intent?.stage).toBe("full_exit");
  });

  it("freezes when the primary snapshot is stale", () => {
    const assessment = evaluateRiskLadder(
      sampleTreasury,
      samplePolicy,
      buildSnapshots({
        ada: { feedUpdateTimestampUs: 1_000_000, observedAtUs: 1_000_000 },
      }),
      sampleRoutes,
      500_000_000,
    );

    expect(assessment.nextStage).toBe("frozen");
    expect(assessment.shouldFreeze).toBe(true);
    expect(assessment.reasons[0]?.code).toBe("stale_feed");
  });

  it("triggers a reentry swap after recovery and hysteresis", () => {
    const treasury = {
      ...sampleTreasury,
      stage: "partial_derisk" as const,
      lastTransitionUs: 0,
      positions: sampleTreasury.positions.map((position) =>
        position.assetId === "ada"
          ? { ...position, amount: 6_000 }
          : { ...position, amount: 4_800 },
      ),
    };
    const snapshots = buildSnapshots({
      ada: {
        price: 79,
        emaPrice: 80,
        confidence: 0.2,
        snapshotId: "snapshot-ada-reentry",
      },
    });

    const assessment = evaluateRiskLadder(
      treasury,
      samplePolicy,
      snapshots,
      sampleRoutes,
      90_000_000,
    );

    expect(assessment.nextStage).toBe("normal");
    expect(assessment.intent?.kind).toBe("reentry_swap");
    expect(assessment.intent?.destinationAssetId).toBe("ada");
  });

  it("respects cooldown and blocks new automatic transitions", () => {
    const treasury = {
      ...sampleTreasury,
      lastTransitionUs: 9_000_000,
    };

    const assessment = evaluateRiskLadder(
      treasury,
      samplePolicy,
      buildSnapshots(),
      sampleRoutes,
      10_000_000,
    );

    expect(assessment.nextStage).toBe("normal");
    expect(assessment.intent).toBeUndefined();
    expect(assessment.cooldownRemainingUs).toBeGreaterThan(0);
  });

  it("keeps the stage change but emits no intent when no approved route exists", () => {
    const assessment = evaluateRiskLadder(
      sampleTreasury,
      {
        ...samplePolicy,
        approvedRouteIds: [],
      },
      buildSnapshots(),
      sampleRoutes,
      100_000_000,
    );

    expect(assessment.nextStage).toBe("partial_derisk");
    expect(assessment.intent).toBeUndefined();
    expect(
      assessment.reasons.some((reason) => reason.code === "execution_route_unavailable"),
    ).toBe(true);
  });

  it("does not select routes from another chain or disabled routes", () => {
    const foreignRoutes = sampleRoutes.map((route, index) => ({
      ...route,
      chainId: index === 0 ? "evm" as const : route.chainId,
      live: index === 1 ? false : route.live,
    }));

    const assessment = evaluateRiskLadder(
      sampleTreasury,
      samplePolicy,
      buildSnapshots(),
      foreignRoutes,
      100_000_000,
    );

    expect(assessment.nextStage).toBe("partial_derisk");
    expect(assessment.intent).toBeUndefined();
    expect(
      assessment.reasons.some((reason) => reason.code === "execution_route_unavailable"),
    ).toBe(true);
  });

  it("builds deterministic snapshot hashes regardless of input object order", () => {
    const firstAssessment = evaluateRiskLadder(
      sampleTreasury,
      samplePolicy,
      buildSnapshots(),
      sampleRoutes,
      100_000_000,
    );
    const reversedSnapshots = buildSnapshots();
    const secondAssessment = evaluateRiskLadder(
      sampleTreasury,
      samplePolicy,
      {
        usdm: reversedSnapshots.usdm!,
        ada: reversedSnapshots.ada!,
      },
      sampleRoutes,
      100_000_000,
    );

    expect(firstAssessment.intent?.snapshotIds).toEqual(secondAssessment.intent?.snapshotIds);
    expect(firstAssessment.intent?.reasonHash).toBe(secondAssessment.intent?.reasonHash);
  });

  it("ignores asset floor breaches when the risky asset is fully exited", () => {
    const treasury = {
      ...sampleTreasury,
      stage: "full_exit" as const,
      positions: sampleTreasury.positions.map((position) =>
        position.assetId === "ada"
          ? { ...position, amount: 0 }
          : { ...position, amount: 7_200 },
      ),
    };
    const assessment = evaluateRiskLadder(
      treasury,
      samplePolicy,
      buildSnapshots({
        ada: {
          price: 79,
          emaPrice: 80,
          confidence: 0.2,
          snapshotId: "snapshot-ada-flat",
        },
      }),
      sampleRoutes,
      100_000_000,
    );

    expect(assessment.nextStage).toBe("normal");
    expect(assessment.intent?.kind).toBe("reentry_swap");
  });
});
