import { stableHash } from "./hash.js";
import {
  confidenceBps,
  isSnapshotStale,
  STAGE_SEVERITY,
  stageMax,
  summarizePortfolio,
  toDecimalPrice,
} from "./math.js";
import type {
  EvaluationReason,
  ExecutionIntent,
  PolicyConfig,
  RiskAssessment,
  RiskStage,
  RouteSpec,
  TreasuryPosition,
  TreasuryState,
  OracleSnapshot,
} from "./types.js";

function createIntentId(): string {
  const cryptoObject: Crypto | undefined =
    (typeof globalThis !== "undefined" &&
      "crypto" in globalThis &&
      globalThis.crypto) ||
    (typeof globalThis !== "undefined" &&
      "webcrypto" in globalThis &&
      (globalThis as typeof globalThis & { webcrypto?: Crypto }).webcrypto) ||
    undefined;

  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  if (cryptoObject && typeof cryptoObject.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoObject.getRandomValues(bytes);
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (segment) =>
      segment.toString(16).padStart(2, "0"),
    );

    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  throw new Error("Secure random generator is not available to create intent ID");
}

function buildReason(
  code: string,
  severity: RiskStage,
  message: string,
  details?: Record<string, number | string | boolean>,
): EvaluationReason {
  return { code, severity, message, details };
}

function clampAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Number(amount.toFixed(8));
}

function getPrimaryRiskPosition(
  treasury: TreasuryState,
  policy: PolicyConfig,
): TreasuryPosition | undefined {
  return treasury.positions.find((position) => position.assetId === policy.primaryAssetId);
}

function getStablePosition(
  treasury: TreasuryState,
  policy: PolicyConfig,
): TreasuryPosition | undefined {
  return treasury.positions.find((position) => position.assetId === policy.stableAssetId);
}

function chooseRoute(
  treasury: TreasuryState,
  policy: PolicyConfig,
  routes: RouteSpec[],
  fromAssetId: string,
  toAssetId: string,
): RouteSpec | undefined {
  return routes.find((candidate) =>
    policy.approvedRouteIds.includes(candidate.routeId) &&
    candidate.chainId === treasury.chainId &&
    candidate.fromAssetId === fromAssetId &&
    candidate.toAssetId === toAssetId &&
    candidate.live,
  );
}

function buildIntent(
  kind: ExecutionIntent["kind"],
  stage: RiskStage,
  sellAmount: number,
  expectedBuyAmount: number,
  treasury: TreasuryState,
  policy: PolicyConfig,
  snapshots: Record<string, OracleSnapshot>,
  route: RouteSpec,
  nowUs: number,
  reasons: EvaluationReason[],
): ExecutionIntent | undefined {
  if (sellAmount <= 0 || expectedBuyAmount <= 0) {
    return undefined;
  }

  const sourceAssetId =
    kind === "reentry_swap" ? policy.stableAssetId : policy.primaryAssetId;
  const destinationAssetId =
    kind === "reentry_swap" ? policy.primaryAssetId : policy.stableAssetId;
  const snapshotIds = Object.values(snapshots)
    .sort((left, right) => left.snapshotId.localeCompare(right.snapshotId))
    .map((snapshot) => snapshot.snapshotId);

  return {
    intentId: createIntentId(),
    vaultId: treasury.vaultId,
    chainId: treasury.chainId,
    kind,
    stage,
    sourceAssetId,
    destinationAssetId,
    routeId: route.routeId,
    maxSellAmount: clampAmount(sellAmount),
    minBuyAmount: clampAmount(
      expectedBuyAmount * (1 - route.maxSlippageBps / 10_000),
    ),
    expiryUs: nowUs + policy.maxStaleUs,
    reasonHash: stableHash({
      stage,
      reasons,
      snapshotIds,
      sellAmount,
      expectedBuyAmount,
    }),
    snapshotIds,
    createdAtUs: nowUs,
  };
}

function buildDeriskIntent(
  targetStage: RiskStage,
  treasury: TreasuryState,
  policy: PolicyConfig,
  snapshots: Record<string, OracleSnapshot>,
  routes: RouteSpec[],
  nowUs: number,
  reasons: EvaluationReason[],
): ExecutionIntent | undefined {
  const riskPosition = getPrimaryRiskPosition(treasury, policy);
  const stablePosition = getStablePosition(treasury, policy);
  const riskSnapshot = snapshots[policy.primaryAssetId];
  const stableSnapshot = snapshots[policy.stableAssetId];

  if (!riskPosition || !stablePosition || !riskSnapshot || !stableSnapshot) {
    return undefined;
  }

  const metrics = summarizePortfolio(treasury.positions, snapshots, policy);
  const route = chooseRoute(
    treasury,
    policy,
    routes,
    policy.primaryAssetId,
    policy.stableAssetId,
  );
  if (!route) {
    return undefined;
  }
  const stablePrice = stableSnapshot ? toDecimalPrice(stableSnapshot) : 1;
  const riskPrice = toDecimalPrice(riskSnapshot) * (1 - policy.haircutBps / 10_000);
  const targetStableValue =
    targetStage === "full_exit"
      ? metrics.totalLiquidValueFiat
      : Math.max(
          policy.portfolioFloorFiat,
          metrics.totalLiquidValueFiat * policy.partialStableTargetRatio,
        );
  const stableGapFiat = Math.max(0, targetStableValue - metrics.stableLiquidValueFiat);
  const sellAmount =
    targetStage === "full_exit"
      ? riskPosition.amount
      : Math.min(riskPosition.amount, stableGapFiat / Math.max(riskPrice, 1e-9));
  const expectedBuyAmount =
    sellAmount * toDecimalPrice(riskSnapshot) / Math.max(stablePrice, 1e-9);

  return buildIntent(
    "derisk_swap",
    targetStage,
    sellAmount,
    expectedBuyAmount,
    treasury,
    policy,
    snapshots,
    route,
    nowUs,
    reasons,
  );
}

function buildReentryIntent(
  treasury: TreasuryState,
  policy: PolicyConfig,
  snapshots: Record<string, OracleSnapshot>,
  routes: RouteSpec[],
  nowUs: number,
  reasons: EvaluationReason[],
): ExecutionIntent | undefined {
  const riskPosition = getPrimaryRiskPosition(treasury, policy);
  const stablePosition = getStablePosition(treasury, policy);
  const riskSnapshot = snapshots[policy.primaryAssetId];
  const stableSnapshot = snapshots[policy.stableAssetId];

  if (!riskPosition || !stablePosition || !riskSnapshot || !stableSnapshot) {
    return undefined;
  }

  const metrics = summarizePortfolio(treasury.positions, snapshots, policy);
  const route = chooseRoute(
    treasury,
    policy,
    routes,
    policy.stableAssetId,
    policy.primaryAssetId,
  );
  if (!route) {
    return undefined;
  }
  const stablePrice = stableSnapshot ? toDecimalPrice(stableSnapshot) : 1;
  const riskPrice = toDecimalPrice(riskSnapshot);
  const targetRiskValue = metrics.totalLiquidValueFiat * policy.reentryRiskTargetRatio;
  const riskGapFiat = Math.max(0, targetRiskValue - metrics.riskLiquidValueFiat);
  const sellAmount = Math.min(
    stablePosition.amount,
    riskGapFiat / Math.max(stablePrice, 1e-9),
  );
  const expectedBuyAmount = sellAmount * stablePrice / Math.max(riskPrice, 1e-9);

  return buildIntent(
    "reentry_swap",
    "normal",
    sellAmount,
    expectedBuyAmount,
    treasury,
    policy,
    snapshots,
    route,
    nowUs,
    reasons,
  );
}

export function evaluateRiskLadder(
  treasury: TreasuryState,
  policy: PolicyConfig,
  snapshots: Record<string, OracleSnapshot>,
  routes: RouteSpec[],
  nowUs: number,
): RiskAssessment {
  const reasons: EvaluationReason[] = [];
  const primarySnapshot = snapshots[policy.primaryAssetId];
  const metrics = summarizePortfolio(treasury.positions, snapshots, policy);
  const cooldownRemainingUs = Math.max(
    0,
    policy.cooldownUs - (nowUs - treasury.lastTransitionUs),
  );

  if (!primarySnapshot) {
    return {
      nowUs,
      currentStage: treasury.stage,
      nextStage: treasury.stage,
      metrics,
      reasons: [
        buildReason(
          "missing_primary_snapshot",
          "frozen",
          "Primary oracle snapshot is unavailable",
        ),
      ],
      cooldownRemainingUs,
      shouldFreeze: true,
    };
  }

  if (isSnapshotStale(primarySnapshot, nowUs, policy.maxStaleUs)) {
    reasons.push(
      buildReason("stale_feed", "frozen", "Primary feed update is stale", {
        age_us: nowUs - primarySnapshot.feedUpdateTimestampUs,
      }),
    );
  }

  const relativeConfidence = confidenceBps(primarySnapshot);
  if (relativeConfidence > policy.maxConfidenceBps) {
    reasons.push(
      buildReason(
        "confidence_guardrail",
        "frozen",
        "Confidence interval is wider than the configured guardrail",
        { confidence_bps: Number(relativeConfidence.toFixed(2)) },
      ),
    );
  }

  if (reasons.some((reason) => reason.severity === "frozen")) {
    return {
      nowUs,
      currentStage: treasury.stage,
      nextStage: "frozen",
      metrics,
      reasons,
      cooldownRemainingUs,
      shouldFreeze: true,
    };
  }

  let targetStage: RiskStage = "normal";
  if (metrics.drawdownBps >= policy.watchDrawdownBps) {
    targetStage = stageMax(targetStage, "watch");
    reasons.push(
      buildReason(
        "drawdown_watch",
        "watch",
        "Primary asset drawdown crossed watch threshold",
        { drawdown_bps: Number(metrics.drawdownBps.toFixed(2)) },
      ),
    );
  }

  if (metrics.drawdownBps >= policy.partialDrawdownBps) {
    targetStage = stageMax(targetStage, "partial_derisk");
    reasons.push(
      buildReason(
        "drawdown_partial",
        "partial_derisk",
        "Primary asset drawdown crossed partial de-risk threshold",
        { drawdown_bps: Number(metrics.drawdownBps.toFixed(2)) },
      ),
    );
  }

  if (metrics.drawdownBps >= policy.fullExitDrawdownBps) {
    targetStage = stageMax(targetStage, "full_exit");
    reasons.push(
      buildReason(
        "drawdown_full_exit",
        "full_exit",
        "Primary asset drawdown crossed full exit threshold",
        { drawdown_bps: Number(metrics.drawdownBps.toFixed(2)) },
      ),
    );
  }

  if (metrics.totalLiquidValueFiat <= policy.portfolioFloorFiat) {
    targetStage = stageMax(targetStage, "partial_derisk");
    reasons.push(
      buildReason(
        "portfolio_floor_breach",
        "partial_derisk",
        "Portfolio liquid value fell below the configured floor",
        {
          total_liquid_fiat: Number(metrics.totalLiquidValueFiat.toFixed(2)),
          floor_fiat: policy.portfolioFloorFiat,
        },
      ),
    );
  }

  if (metrics.totalLiquidValueFiat <= policy.emergencyPortfolioFloorFiat) {
    targetStage = stageMax(targetStage, "full_exit");
    reasons.push(
      buildReason(
        "portfolio_emergency_floor_breach",
        "full_exit",
        "Portfolio liquid value fell below the emergency floor",
        {
          total_liquid_fiat: Number(metrics.totalLiquidValueFiat.toFixed(2)),
          floor_fiat: policy.emergencyPortfolioFloorFiat,
        },
      ),
    );
  }

  for (const assetRule of policy.assetRules.filter((rule) => rule.enabled)) {
    const liquidValue = metrics.assetLiquidValues[assetRule.assetId] ?? 0;
    const hasExposure = treasury.positions.some(
      (position) => position.assetId === assetRule.assetId && position.amount > 0,
    );
    if (!hasExposure) {
      continue;
    }

    if (liquidValue <= assetRule.protectedFloorFiat) {
      targetStage = stageMax(targetStage, "partial_derisk");
      reasons.push(
        buildReason(
          "asset_floor_breach",
          "partial_derisk",
          `${assetRule.symbol} liquid value fell below its protected floor`,
          {
            asset_id: assetRule.assetId,
            liquid_value_fiat: Number(liquidValue.toFixed(2)),
            floor_fiat: assetRule.protectedFloorFiat,
          },
        ),
      );
    }
    if (liquidValue <= assetRule.emergencyExitFloorFiat) {
      targetStage = stageMax(targetStage, "full_exit");
      reasons.push(
        buildReason(
          "asset_emergency_floor_breach",
          "full_exit",
          `${assetRule.symbol} liquid value fell below its emergency floor`,
          {
            asset_id: assetRule.assetId,
            liquid_value_fiat: Number(liquidValue.toFixed(2)),
            floor_fiat: assetRule.emergencyExitFloorFiat,
          },
        ),
      );
    }
  }

  const reentryAllowed =
    (treasury.stage === "partial_derisk" || treasury.stage === "full_exit") &&
    metrics.drawdownBps <= policy.reentryDrawdownBps &&
    metrics.totalLiquidValueFiat > policy.portfolioFloorFiat &&
    metrics.stableLiquidValueFiat > policy.portfolioFloorFiat;

  let nextStage = targetStage;
  let intent: ExecutionIntent | undefined;

  if (cooldownRemainingUs > 0 && targetStage !== "frozen") {
    reasons.push(
      buildReason(
        "cooldown_active",
        treasury.stage,
        "Cooldown prevents an automatic state transition",
        { cooldown_remaining_us: cooldownRemainingUs },
      ),
    );
    nextStage = treasury.stage;
  } else if (reentryAllowed && targetStage === "normal") {
    reasons.push(
      buildReason(
        "reentry_window",
        "normal",
        "Recovery conditions satisfied the automatic re-entry band",
        { drawdown_bps: Number(metrics.drawdownBps.toFixed(2)) },
      ),
    );
    nextStage = "normal";
    intent = buildReentryIntent(
      treasury,
      policy,
      snapshots,
      routes,
      nowUs,
      reasons,
    );
    if (!intent) {
      reasons.push(
        buildReason(
          "reentry_route_unavailable",
          treasury.stage,
          "Recovery conditions are satisfied but no approved route is available for re-entry",
        ),
      );
      nextStage = treasury.stage;
    }
  } else if (STAGE_SEVERITY[targetStage] > STAGE_SEVERITY[treasury.stage]) {
    nextStage = targetStage;
    if (targetStage === "partial_derisk" || targetStage === "full_exit") {
      intent = buildDeriskIntent(
        targetStage,
        treasury,
        policy,
        snapshots,
        routes,
        nowUs,
        reasons,
      );
      if (!intent) {
        reasons.push(
          buildReason(
            "execution_route_unavailable",
            targetStage,
            "Risk stage changed but no approved route is available for execution",
          ),
        );
      }
    }
  } else {
    nextStage = treasury.stage;
  }

  return {
    nowUs,
    currentStage: treasury.stage,
    nextStage,
    metrics,
    reasons,
    intent,
    cooldownRemainingUs,
    shouldFreeze: false,
  };
}
