import type { PolicyConfig as UiPolicyConfig, RiskStage } from "./types";

export type CustodyMode = "native" | "squads" | "safe";

export interface ReferenceAssetOption {
  symbol: string;
  label: string;
  defaultPrice: number;
  category: "rwa" | "crypto" | "fx";
}

export interface VaultBootstrapDraft {
  companyName: string;
  vaultName: string;
  custodyMode: CustodyMode;
  governanceWallet: string;
  executionHotWallet: string;
  primaryAssetId: string;
  stableAssetId: string;
  approvedRouteId: string;
  portfolioFloorFiat: number;
  emergencyPortfolioFloorFiat: number;
  watchDrawdownBps: number;
  partialDrawdownBps: number;
  fullExitDrawdownBps: number;
  reentryDrawdownBps: number;
  haircutBps: number;
  useReferenceTarget: boolean;
  targetOunces: number;
  referenceSymbol: string;
  referencePrice: number;
}

export interface BootstrapChecklistItem {
  id: string;
  label: string;
  ready: boolean;
}

export interface ScenarioDraft {
  presetId: string;
  startingStage: RiskStage;
  adaPrice: number;
  adaEmaPrice: number;
  adaConfidence: number;
  stablePrice: number;
  xauUsd: number;
  adaAmount: number;
  stableAmount: number;
  secondsSinceUpdate: number;
  secondsSinceLastTransition: number;
}

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  draft: ScenarioDraft;
}

export interface ScenarioMetrics {
  totalLiquidValueFiat: number;
  stableLiquidValueFiat: number;
  riskLiquidValueFiat: number;
  stableRatio: number;
  drawdownBps: number;
}

export interface ScenarioIntent {
  kind: "derisk_swap" | "reentry_swap";
  routeId: string;
  maxSellAmount: number;
  minBuyAmount: number;
}

export interface ScenarioReason {
  code: string;
  message: string;
}

export interface ScenarioAssessment {
  currentStage: RiskStage;
  nextStage: RiskStage;
  metrics: ScenarioMetrics;
  reasons: ScenarioReason[];
  intent?: ScenarioIntent;
  shouldFreeze: boolean;
}

export interface ScenarioResult {
  assessment: ScenarioAssessment;
  referenceTargetAda: number;
}

const MAX_STALE_SECONDS = 30;
const MAX_CONFIDENCE_BPS = 200;
const MAX_COOLDOWN_SECONDS = 600;
const DEFAULT_SLIPPAGE_BPS = 120;

export const referenceAssetOptions: ReferenceAssetOption[] = [
  {
    symbol: "XAU/USD",
    label: "Gold (XAU/USD)",
    defaultPrice: 4421.412,
    category: "rwa",
  },
  {
    symbol: "BTC/USD",
    label: "Bitcoin (BTC/USD)",
    defaultPrice: 67846.32774,
    category: "crypto",
  },
  {
    symbol: "SOL/USD",
    label: "Solana (SOL/USD)",
    defaultPrice: 86.2,
    category: "crypto",
  },
  {
    symbol: "EUR/USD",
    label: "Euro (EUR/USD)",
    defaultPrice: 1.15578,
    category: "fx",
  },
];

const STAGE_SEVERITY: Record<RiskStage, number> = {
  normal: 0,
  watch: 1,
  partial_derisk: 2,
  full_exit: 3,
  frozen: 4,
};

function stageMax(left: RiskStage, right: RiskStage): RiskStage {
  return STAGE_SEVERITY[left] >= STAGE_SEVERITY[right] ? left : right;
}

function clampAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Number(value.toFixed(6));
}

function computeDrawdownBps(spot: number, ema: number): number {
  if (!Number.isFinite(spot) || !Number.isFinite(ema) || ema <= 0 || spot >= ema) {
    return 0;
  }

  return ((ema - spot) / ema) * 10_000;
}

function computeConfidenceBps(price: number, confidence: number): number {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(confidence) || confidence < 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (confidence / price) * 10_000;
}

function buildDeriskIntent(
  stage: RiskStage,
  scenario: ScenarioDraft,
  draft: VaultBootstrapDraft,
  metrics: ScenarioMetrics,
): ScenarioIntent | undefined {
  const riskPriceAfterHaircut = scenario.adaPrice * (1 - draft.haircutBps / 10_000);
  if (riskPriceAfterHaircut <= 0 || scenario.stablePrice <= 0) {
    return undefined;
  }

  const targetStableValue =
    stage === "full_exit"
      ? metrics.totalLiquidValueFiat
      : Math.max(draft.portfolioFloorFiat, metrics.totalLiquidValueFiat * 0.5);
  const stableGapFiat = Math.max(0, targetStableValue - metrics.stableLiquidValueFiat);
  const sellAmount =
    stage === "full_exit"
      ? scenario.adaAmount
      : Math.min(scenario.adaAmount, stableGapFiat / riskPriceAfterHaircut);
  const expectedBuyAmount = (sellAmount * scenario.adaPrice) / scenario.stablePrice;

  if (sellAmount <= 0 || expectedBuyAmount <= 0) {
    return undefined;
  }

  return {
    kind: "derisk_swap",
    routeId: draft.approvedRouteId,
    maxSellAmount: clampAmount(sellAmount),
    minBuyAmount: clampAmount(expectedBuyAmount * (1 - DEFAULT_SLIPPAGE_BPS / 10_000)),
  };
}

function buildReentryIntent(
  scenario: ScenarioDraft,
  draft: VaultBootstrapDraft,
  metrics: ScenarioMetrics,
): ScenarioIntent | undefined {
  if (scenario.adaPrice <= 0 || scenario.stablePrice <= 0) {
    return undefined;
  }

  const targetRiskValue = metrics.totalLiquidValueFiat * 0.6;
  const riskGapFiat = Math.max(0, targetRiskValue - metrics.riskLiquidValueFiat);
  const sellAmount = Math.min(scenario.stableAmount, riskGapFiat / scenario.stablePrice);
  const expectedBuyAmount = (sellAmount * scenario.stablePrice) / scenario.adaPrice;

  if (sellAmount <= 0 || expectedBuyAmount <= 0) {
    return undefined;
  }

  return {
    kind: "reentry_swap",
    routeId: draft.approvedRouteId,
    maxSellAmount: clampAmount(sellAmount),
    minBuyAmount: clampAmount(expectedBuyAmount * (1 - DEFAULT_SLIPPAGE_BPS / 10_000)),
  };
}

export function computeReferenceTargetAda(
  targetOunces: number,
  xauUsd: number,
  adaUsd: number,
): number {
  if (
    !Number.isFinite(targetOunces) ||
    !Number.isFinite(xauUsd) ||
    !Number.isFinite(adaUsd) ||
    targetOunces <= 0 ||
    xauUsd <= 0 ||
    adaUsd <= 0
  ) {
    return 0;
  }

  return Number(((targetOunces * xauUsd) / adaUsd).toFixed(6));
}

export function buildBootstrapDraft(policy: UiPolicyConfig): VaultBootstrapDraft {
  return {
    companyName: "Guards Treasury Ops",
    vaultName: "Main Treasury",
    custodyMode: "native",
    governanceWallet: "addr_test1q...governance",
    executionHotWallet: "addr_test1q...hot",
    primaryAssetId: policy.primaryAssetId,
    stableAssetId: policy.stableAssetId,
    approvedRouteId: policy.approvedRouteIds[0] ?? "dexhunter-ada-usdm",
    portfolioFloorFiat: policy.portfolioFloorFiat,
    emergencyPortfolioFloorFiat: policy.emergencyPortfolioFloorFiat,
    watchDrawdownBps: policy.watchDrawdownBps,
    partialDrawdownBps: policy.partialDrawdownBps,
    fullExitDrawdownBps: policy.fullExitDrawdownBps,
    reentryDrawdownBps: Math.min(
      Math.abs(policy.reentryDrawdownBps),
      policy.watchDrawdownBps,
    ),
    haircutBps: policy.haircutBps,
    useReferenceTarget: false,
    targetOunces: 25,
    referenceSymbol: "XAU/USD",
    referencePrice: 4421.412,
  };
}

export function buildPolicyViewFromDraft(draft: VaultBootstrapDraft): UiPolicyConfig {
  return {
    policyId: "guards-policy-draft",
    primaryAssetId: draft.primaryAssetId,
    primaryFeedId: "pyth-ada-usd",
    stableAssetId: draft.stableAssetId,
    approvedRouteIds: [draft.approvedRouteId],
    haircutBps: draft.haircutBps,
    maxStaleUs: MAX_STALE_SECONDS * 1_000_000,
    maxConfidenceBps: MAX_CONFIDENCE_BPS,
    cooldownUs: 600_000_000,
    watchDrawdownBps: draft.watchDrawdownBps,
    partialDrawdownBps: draft.partialDrawdownBps,
    fullExitDrawdownBps: draft.fullExitDrawdownBps,
    reentryDrawdownBps: draft.reentryDrawdownBps,
    portfolioFloorFiat: draft.portfolioFloorFiat,
    emergencyPortfolioFloorFiat: draft.emergencyPortfolioFloorFiat,
    partialStableTargetRatio: 0.5,
    reentryRiskTargetRatio: 0.6,
  };
}

export function buildBootstrapChecklist(
  draft: VaultBootstrapDraft,
): BootstrapChecklistItem[] {
  return [
    {
      id: "governance-wallet",
      label: "Governance wallet present",
      ready: draft.governanceWallet.trim().length > 0,
    },
    {
      id: "hot-wallet",
      label: "Execution hot wallet present",
      ready: draft.executionHotWallet.trim().length > 0,
    },
    {
      id: "risk-limits",
      label: "Risk thresholds are monotonic",
      ready:
        draft.watchDrawdownBps < draft.partialDrawdownBps &&
        draft.partialDrawdownBps < draft.fullExitDrawdownBps &&
        draft.reentryDrawdownBps >= 0 &&
        draft.reentryDrawdownBps <= draft.watchDrawdownBps,
    },
    {
      id: "floors",
      label: "Emergency floor is below protected floor",
      ready: draft.emergencyPortfolioFloorFiat < draft.portfolioFloorFiat,
    },
    {
      id: "route",
      label: "Approved execution route selected",
      ready: draft.approvedRouteId.trim().length > 0,
    },
  ];
}

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: "normal",
    label: "Normal",
    description: "Treasury remains inside policy bands.",
    draft: {
      presetId: "normal",
      startingStage: "normal",
      adaPrice: 0.48,
      adaEmaPrice: 0.47,
      adaConfidence: 0.002,
      stablePrice: 1,
      xauUsd: 4421.412,
      adaAmount: 125000,
      stableAmount: 37500,
      secondsSinceUpdate: 2,
      secondsSinceLastTransition: 900,
    },
  },
  {
    id: "watch",
    label: "Watch",
    description: "Small drawdown crosses watch but does not execute.",
    draft: {
      presetId: "watch",
      startingStage: "normal",
      adaPrice: 0.455,
      adaEmaPrice: 0.47,
      adaConfidence: 0.0024,
      stablePrice: 1,
      xauUsd: 4421.412,
      adaAmount: 125000,
      stableAmount: 37500,
      secondsSinceUpdate: 2,
      secondsSinceLastTransition: 900,
    },
  },
  {
    id: "partial",
    label: "Partial De-Risk",
    description: "Drawdown and floor pressure create a partial de-risk intent.",
    draft: {
      presetId: "partial",
      startingStage: "watch",
      adaPrice: 0.437,
      adaEmaPrice: 0.47,
      adaConfidence: 0.0028,
      stablePrice: 1,
      xauUsd: 4421.412,
      adaAmount: 125000,
      stableAmount: 37500,
      secondsSinceUpdate: 2,
      secondsSinceLastTransition: 900,
    },
  },
  {
    id: "full-exit",
    label: "Full Exit",
    description: "Emergency floor breach moves the vault fully defensive.",
    draft: {
      presetId: "full-exit",
      startingStage: "partial_derisk",
      adaPrice: 0.26,
      adaEmaPrice: 0.47,
      adaConfidence: 0.0035,
      stablePrice: 1,
      xauUsd: 4421.412,
      adaAmount: 125000,
      stableAmount: 37500,
      secondsSinceUpdate: 2,
      secondsSinceLastTransition: 900,
    },
  },
  {
    id: "frozen",
    label: "Frozen",
    description: "Oracle guardrails block execution because the feed is stale.",
    draft: {
      presetId: "frozen",
      startingStage: "watch",
      adaPrice: 0.44,
      adaEmaPrice: 0.47,
      adaConfidence: 0.002,
      stablePrice: 1,
      xauUsd: 4421.412,
      adaAmount: 125000,
      stableAmount: 37500,
      secondsSinceUpdate: 45,
      secondsSinceLastTransition: 900,
    },
  },
  {
    id: "reentry",
    label: "Re-Entry",
    description: "A recovery from defensive mode opens a re-entry swap.",
    draft: {
      presetId: "reentry",
      startingStage: "full_exit",
      adaPrice: 0.5,
      adaEmaPrice: 0.47,
      adaConfidence: 0.0018,
      stablePrice: 1,
      xauUsd: 4421.412,
      adaAmount: 55000,
      stableAmount: 90000,
      secondsSinceUpdate: 2,
      secondsSinceLastTransition: 900,
    },
  },
];

export function runScenario(
  scenario: ScenarioDraft,
  draft: VaultBootstrapDraft,
): ScenarioResult {
  const riskLiquidValueFiat =
    scenario.adaAmount * scenario.adaPrice * (1 - draft.haircutBps / 10_000);
  const stableLiquidValueFiat = scenario.stableAmount * scenario.stablePrice;
  const totalLiquidValueFiat = riskLiquidValueFiat + stableLiquidValueFiat;
  const stableRatio = totalLiquidValueFiat > 0 ? stableLiquidValueFiat / totalLiquidValueFiat : 0;
  const drawdownBps = computeDrawdownBps(scenario.adaPrice, scenario.adaEmaPrice);
  const confidenceBps = computeConfidenceBps(scenario.adaPrice, scenario.adaConfidence);
  const cooldownRemainingSeconds = Math.max(
    0,
    MAX_COOLDOWN_SECONDS - scenario.secondsSinceLastTransition,
  );

  const metrics: ScenarioMetrics = {
    totalLiquidValueFiat,
    stableLiquidValueFiat,
    riskLiquidValueFiat,
    stableRatio,
    drawdownBps,
  };

  const reasons: ScenarioReason[] = [];

  if (scenario.secondsSinceUpdate > MAX_STALE_SECONDS) {
    reasons.push({
      code: "stale_feed",
      message: "Primary feed update is stale.",
    });
  }

  if (confidenceBps > MAX_CONFIDENCE_BPS) {
    reasons.push({
      code: "confidence_guardrail",
      message: "Confidence interval is wider than the configured guardrail.",
    });
  }

  if (reasons.length > 0) {
    return {
      assessment: {
        currentStage: scenario.startingStage,
        nextStage: "frozen",
        metrics,
        reasons,
        shouldFreeze: true,
      },
      referenceTargetAda: computeReferenceTargetAda(
        draft.targetOunces,
        scenario.xauUsd,
        scenario.adaPrice,
      ),
    };
  }

  let targetStage: RiskStage = "normal";
  if (drawdownBps >= draft.watchDrawdownBps) {
    targetStage = stageMax(targetStage, "watch");
    reasons.push({
      code: "drawdown_watch",
      message: "Primary asset drawdown crossed watch threshold.",
    });
  }
  if (drawdownBps >= draft.partialDrawdownBps) {
    targetStage = stageMax(targetStage, "partial_derisk");
    reasons.push({
      code: "drawdown_partial",
      message: "Primary asset drawdown crossed partial de-risk threshold.",
    });
  }
  if (drawdownBps >= draft.fullExitDrawdownBps) {
    targetStage = stageMax(targetStage, "full_exit");
    reasons.push({
      code: "drawdown_full_exit",
      message: "Primary asset drawdown crossed full exit threshold.",
    });
  }
  if (totalLiquidValueFiat <= draft.portfolioFloorFiat) {
    targetStage = stageMax(targetStage, "partial_derisk");
    reasons.push({
      code: "portfolio_floor_breach",
      message: "Portfolio liquid value fell below the configured floor.",
    });
  }
  if (totalLiquidValueFiat <= draft.emergencyPortfolioFloorFiat) {
    targetStage = stageMax(targetStage, "full_exit");
    reasons.push({
      code: "portfolio_emergency_floor_breach",
      message: "Portfolio liquid value fell below the emergency floor.",
    });
  }

  const reentryAllowed =
    (scenario.startingStage === "partial_derisk" || scenario.startingStage === "full_exit") &&
    drawdownBps <= draft.reentryDrawdownBps &&
    totalLiquidValueFiat > draft.portfolioFloorFiat &&
    stableLiquidValueFiat > draft.portfolioFloorFiat;

  let nextStage: RiskStage = scenario.startingStage;
  let intent: ScenarioIntent | undefined;

  if (reentryAllowed && targetStage === "normal") {
    if (cooldownRemainingSeconds > 0) {
      reasons.push({
        code: "cooldown_active",
        message: `Cooldown active for ${cooldownRemainingSeconds}s before re-entry can execute.`,
      });
    } else {
      reasons.push({
        code: "reentry_window",
        message: "Recovery conditions satisfied the automatic re-entry band.",
      });
      nextStage = "normal";
      intent = buildReentryIntent(scenario, draft, metrics);
    }
  } else if (STAGE_SEVERITY[targetStage] > STAGE_SEVERITY[scenario.startingStage]) {
    if (cooldownRemainingSeconds > 0 && targetStage !== "frozen") {
      reasons.push({
        code: "cooldown_active",
        message: `Cooldown active for ${cooldownRemainingSeconds}s before another automatic transition can execute.`,
      });
    } else {
      nextStage = targetStage;
      if (targetStage === "partial_derisk" || targetStage === "full_exit") {
        intent = buildDeriskIntent(targetStage, scenario, draft, metrics);
      }
    }
  }

  return {
    assessment: {
      currentStage: scenario.startingStage,
      nextStage,
      metrics,
      reasons,
      intent,
      shouldFreeze: false,
    },
    referenceTargetAda: computeReferenceTargetAda(
      draft.targetOunces,
      scenario.xauUsd,
      scenario.adaPrice,
    ),
  };
}
