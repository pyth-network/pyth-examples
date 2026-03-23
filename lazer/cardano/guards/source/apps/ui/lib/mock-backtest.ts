import type { RiskStage } from "./types";
import {
  computeReferenceTargetAda,
  runScenario,
  type ScenarioDraft,
  type VaultBootstrapDraft,
} from "./vault-lab";

export type MockStrategyId = "guards_ladder" | "floor_defender" | "xau_target";
export type MockDatasetId =
  | "ada_treasury_base"
  | "ada_flash_crash"
  | "stable_depeg"
  | "xau_rotation";

export interface MockStrategyOption {
  id: MockStrategyId;
  label: string;
  description: string;
}

export interface MockBacktestOptions {
  strategy: MockStrategyId;
  dataset: MockDatasetId;
  days: number;
  intervalMinutes: number;
  referenceSymbol: string;
}

export interface MockBacktestPoint {
  index: number;
  timestampMs: number;
  label: string;
  adaPrice: number;
  adaEmaPrice: number;
  adaConfidence: number;
  stablePrice: number;
  referencePrice: number;
  stage: RiskStage;
  liquidValueFiat: number;
  stableRatio: number;
  trigger: string;
  executionLabel?: string;
}

export interface MockBacktestExecution {
  id: string;
  timestampMs: number;
  stage: RiskStage;
  kind: "derisk_swap" | "reentry_swap";
  routeId: string;
  sellAmount: number;
  buyAmount: number;
  sourceSymbol: string;
  destinationSymbol: string;
  reason: string;
}

export interface MockBacktestSummary {
  pointCount: number;
  executionCount: number;
  minLiquidValueFiat: number;
  maxStableRatio: number;
  finalStage: RiskStage;
  finalLiquidValueFiat: number;
  finalStableRatio: number;
}

export interface MockBacktestResult {
  points: MockBacktestPoint[];
  executions: MockBacktestExecution[];
  summary: MockBacktestSummary;
}

export interface MockDatasetOption {
  id: MockDatasetId;
  label: string;
  description: string;
}

interface MockPricePoint {
  timestampMs: number;
  adaPrice: number;
  adaEmaPrice: number;
  adaConfidence: number;
  stablePrice: number;
  referencePrice: number;
}

interface HoldingsState {
  adaAmount: number;
  stableAmount: number;
}

const MOCK_BACKTEST_ANCHOR_MS = Date.parse("2026-03-22T19:00:00.000Z");

const DEFAULT_OPTIONS: MockBacktestOptions = {
  strategy: "guards_ladder",
  dataset: "ada_treasury_base",
  days: 7,
  intervalMinutes: 15,
  referenceSymbol: "XAU/USD",
};

export const mockStrategyOptions: MockStrategyOption[] = [
  {
    id: "guards_ladder",
    label: "Guards ladder",
    description: "Use the full drawdown + floor ladder and execute bounded swaps whenever policy allows.",
  },
  {
    id: "floor_defender",
    label: "Floor defender",
    description: "Ignore early drawdown noise. Only execute once protected fiat/stable floors are threatened.",
  },
  {
    id: "xau_target",
    label: "XAU target",
    description: "Keep ADA exposure near a target number of gold ounces, while still honoring freeze and full-exit guardrails.",
  },
];

export const mockDatasetOptions: MockDatasetOption[] = [
  {
    id: "ada_treasury_base",
    label: "ADA treasury base",
    description: "Normal volatility with one mid-cycle selloff and recovery.",
  },
  {
    id: "ada_flash_crash",
    label: "ADA flash crash",
    description: "Fast shock that should force partial and full defensive actions.",
  },
  {
    id: "stable_depeg",
    label: "Stable depeg",
    description: "Stable rail drifts under $1 while ADA stays relatively calm.",
  },
  {
    id: "xau_rotation",
    label: "XAU rotation",
    description: "Reference asset trend diverges from ADA and forces target rebalancing.",
  },
];

const STAGE_PRIORITY: Record<RiskStage, number> = {
  normal: 0,
  watch: 1,
  partial_derisk: 2,
  full_exit: 3,
  frozen: 4,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toLabel(timestampMs: number): string {
  const date = new Date(timestampMs);
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  const day = dayFormatter.format(date);
  const time = timeFormatter.format(date);

  return `${day} ${time}`;
}

function referenceBasePrice(referenceSymbol: string): number {
  switch (referenceSymbol) {
    case "BTC/USD":
      return 67_846.32774;
    case "SOL/USD":
      return 86.2;
    case "EUR/USD":
      return 1.15578;
    case "XAU/USD":
    default:
      return 4_421.412;
  }
}

function buildReferencePrice(
  referenceSymbol: string,
  dataset: MockDatasetId,
  index: number,
  progress: number,
): number {
  if (referenceSymbol === "BTC/USD") {
    const crashBias = dataset === "ada_flash_crash" ? -3_500 : 0;
    return 87_250 + progress * 1_850 + Math.sin(index / 16) * 620 + crashBias;
  }

  if (referenceSymbol === "SOL/USD") {
    const rotationBias = dataset === "xau_rotation" ? 24 : 0;
    return 186 + progress * 14 + Math.sin(index / 13) * 9 + rotationBias;
  }

  if (referenceSymbol === "EUR/USD") {
    const depegBias = dataset === "stable_depeg" ? -0.018 : 0;
    return 1.09 + progress * 0.012 + Math.sin(index / 18) * 0.006 + depegBias;
  }

  const rotationBias = dataset === "xau_rotation" ? progress * 160 : progress * 18;
  return referenceBasePrice(referenceSymbol) + Math.sin(index / 35) * 24 + rotationBias;
}

function buildPriceSeries(
  options: MockBacktestOptions,
  anchorNowMs: number = MOCK_BACKTEST_ANCHOR_MS,
): MockPricePoint[] {
  const steps = Math.max(8, Math.floor((options.days * 24 * 60) / options.intervalMinutes));
  const endMs = anchorNowMs;
  const startMs = endMs - options.days * 24 * 60 * 60 * 1000;
  let ema = 0.48;

  return Array.from({ length: steps }, (_, index) => {
    const progress = index / Math.max(steps - 1, 1);
    const timestampMs = startMs + index * options.intervalMinutes * 60 * 1000;
    let base = 0.48;
    let slowWave = Math.sin(index / 22) * 0.02;
    let fastWave = Math.sin(index / 7) * 0.008;
    let selloff = Math.exp(-Math.pow((progress - 0.48) / 0.085, 2)) * -0.18;
    let recovery = Math.exp(-Math.pow((progress - 0.82) / 0.09, 2)) * 0.1;
    let drift = progress > 0.6 ? (progress - 0.6) * 0.015 : 0;
    let stablePrice = clamp(1 + Math.sin(index / 48) * 0.0018, 0.995, 1.004);
    let referencePrice = buildReferencePrice(
      options.referenceSymbol,
      options.dataset,
      index,
      progress,
    );

    if (options.dataset === "ada_flash_crash") {
      selloff = Math.exp(-Math.pow((progress - 0.42) / 0.05, 2)) * -0.28;
      recovery = Math.exp(-Math.pow((progress - 0.78) / 0.08, 2)) * 0.07;
      drift = progress > 0.7 ? (progress - 0.7) * 0.008 : 0;
    } else if (options.dataset === "stable_depeg") {
      stablePrice = clamp(1 - Math.exp(-Math.pow((progress - 0.58) / 0.08, 2)) * 0.022, 0.972, 1.003);
      selloff = Math.exp(-Math.pow((progress - 0.5) / 0.12, 2)) * -0.08;
      recovery = Math.exp(-Math.pow((progress - 0.84) / 0.1, 2)) * 0.04;
    } else if (options.dataset === "xau_rotation") {
      base = 0.46;
      slowWave = Math.sin(index / 26) * 0.015;
      fastWave = Math.sin(index / 9) * 0.006;
      selloff = Math.exp(-Math.pow((progress - 0.5) / 0.11, 2)) * -0.09;
      recovery = Math.exp(-Math.pow((progress - 0.86) / 0.08, 2)) * 0.03;
      referencePrice = buildReferencePrice(
        options.referenceSymbol,
        options.dataset,
        index,
        progress,
      );
    }

    const adaPrice = clamp(base + slowWave + fastWave + selloff + recovery + drift, 0.18, 0.82);
    ema = ema * 0.92 + adaPrice * 0.08;
    const stress = Math.max(0, (ema - adaPrice) / Math.max(ema, 0.0001));
    const adaConfidence = 0.0018 + stress * 0.045;

    return {
      timestampMs,
      adaPrice: Number(adaPrice.toFixed(6)),
      adaEmaPrice: Number(ema.toFixed(6)),
      adaConfidence: Number(adaConfidence.toFixed(6)),
      stablePrice: Number(stablePrice.toFixed(6)),
      referencePrice: Number(referencePrice.toFixed(2)),
    };
  });
}

function stableRatio(adaAmount: number, stableAmount: number, adaPrice: number, stablePrice: number, haircutBps: number): number {
  const riskLiquid = adaAmount * adaPrice * (1 - haircutBps / 10_000);
  const stableLiquid = stableAmount * stablePrice;
  const total = riskLiquid + stableLiquid;
  return total > 0 ? stableLiquid / total : 0;
}

function liquidValue(adaAmount: number, stableAmount: number, adaPrice: number, stablePrice: number, haircutBps: number): number {
  return adaAmount * adaPrice * (1 - haircutBps / 10_000) + stableAmount * stablePrice;
}

function applyExecution(
  holdings: HoldingsState,
  scenario: ScenarioDraft,
  draft: VaultBootstrapDraft,
  strategy: MockStrategyId,
): { nextStage: RiskStage; execution?: MockBacktestExecution; trigger: string } {
  const result = runScenario(scenario, draft);
  const { assessment } = result;
  const safetyReason = assessment.reasons[0]?.message ?? "Policy ladder evaluation";

  if (assessment.shouldFreeze) {
    return { nextStage: "frozen", trigger: safetyReason };
  }

  let intent = assessment.intent;
  let nextStage = assessment.nextStage;
  let trigger = safetyReason;

  if (strategy === "floor_defender") {
    const hasFloorBreach = assessment.reasons.some((reason) => reason.code.includes("floor"));
    if (!hasFloorBreach && nextStage !== "frozen") {
      intent = undefined;
      nextStage = STAGE_PRIORITY[nextStage] > STAGE_PRIORITY["watch"] ? "watch" : nextStage;
      trigger = "Watching until floors are threatened";
    }
  }

  if (strategy === "xau_target" && nextStage !== "frozen" && nextStage !== "full_exit") {
    const referenceTargetAda = computeReferenceTargetAda(
      draft.targetOunces,
      scenario.xauUsd,
      scenario.adaPrice,
    );
    const deviation = referenceTargetAda > 0 ? (holdings.adaAmount - referenceTargetAda) / referenceTargetAda : 0;
    const threshold = 0.12;

    if (Math.abs(deviation) > threshold) {
      const routeId = draft.approvedRouteId;
      if (deviation > 0) {
        const excessAda = Math.max(0, holdings.adaAmount - referenceTargetAda);
        const sellAmount = Number((excessAda * 0.2).toFixed(6));
        const buyAmount = Number(((sellAmount * scenario.adaPrice) / scenario.stablePrice).toFixed(6));
        if (sellAmount > 0 && buyAmount > 0) {
          intent = {
            kind: "derisk_swap",
            routeId,
            maxSellAmount: sellAmount,
            minBuyAmount: buyAmount,
          };
          nextStage = "watch";
          trigger = `${draft.referenceSymbol} target drift: ADA above target ounces`;
        }
      } else {
        const stableSellAmount = Number((holdings.stableAmount * 0.18).toFixed(6));
        const buyAmount = Number(((stableSellAmount * scenario.stablePrice) / scenario.adaPrice).toFixed(6));
        if (stableSellAmount > 0 && buyAmount > 0) {
          intent = {
            kind: "reentry_swap",
            routeId,
            maxSellAmount: stableSellAmount,
            minBuyAmount: buyAmount,
          };
          nextStage = "watch";
          trigger = `${draft.referenceSymbol} target drift: ADA below target ounces`;
        }
      }
    }
  }

  if (!intent) {
    return { nextStage, trigger };
  }

  if (intent.kind === "derisk_swap") {
    const sellAmount = Math.min(intent.maxSellAmount, holdings.adaAmount);
    const buyAmount = sellAmount > 0 ? (sellAmount * scenario.adaPrice) / scenario.stablePrice : 0;
    holdings.adaAmount = Number((holdings.adaAmount - sellAmount).toFixed(6));
    holdings.stableAmount = Number((holdings.stableAmount + buyAmount).toFixed(6));

    return {
      nextStage,
      trigger,
      execution: {
        id: `${strategy}-${scenario.presetId}-${scenario.secondsSinceUpdate}-${scenario.adaPrice}`,
        timestampMs: 0,
        stage: nextStage,
        kind: "derisk_swap",
        routeId: intent.routeId,
        sellAmount: Number(sellAmount.toFixed(6)),
        buyAmount: Number(buyAmount.toFixed(6)),
        sourceSymbol: "ADA",
        destinationSymbol: "USDM",
        reason: trigger,
      },
    };
  }

  const stableSellAmount = Math.min(intent.maxSellAmount, holdings.stableAmount);
  const adaBuyAmount = stableSellAmount > 0 ? (stableSellAmount * scenario.stablePrice) / scenario.adaPrice : 0;
  holdings.stableAmount = Number((holdings.stableAmount - stableSellAmount).toFixed(6));
  holdings.adaAmount = Number((holdings.adaAmount + adaBuyAmount).toFixed(6));

  return {
    nextStage,
    trigger,
    execution: {
      id: `${strategy}-${scenario.presetId}-${scenario.secondsSinceUpdate}-${scenario.adaPrice}`,
      timestampMs: 0,
      stage: nextStage,
      kind: "reentry_swap",
      routeId: intent.routeId,
      sellAmount: Number(stableSellAmount.toFixed(6)),
      buyAmount: Number(adaBuyAmount.toFixed(6)),
      sourceSymbol: "USDM",
      destinationSymbol: "ADA",
      reason: trigger,
    },
  };
}

export function runMockBacktest(
  draft: VaultBootstrapDraft,
  options: Partial<MockBacktestOptions> = {},
): MockBacktestResult {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const priceSeries = buildPriceSeries(resolved);
  const executions: MockBacktestExecution[] = [];
  const points: MockBacktestPoint[] = [];
  const holdings: HoldingsState = {
    adaAmount: 125000,
    stableAmount: 37500,
  };
  let currentStage: RiskStage = "normal";
  let minLiquidValueFiat = Number.POSITIVE_INFINITY;
  let maxStableRatio = 0;

  for (const [index, point] of priceSeries.entries()) {
    const scenario: ScenarioDraft = {
      presetId: `backtest-${resolved.strategy}`,
      startingStage: currentStage,
      adaPrice: point.adaPrice,
      adaEmaPrice: point.adaEmaPrice,
      adaConfidence: point.adaConfidence,
      stablePrice: point.stablePrice,
      xauUsd: point.referencePrice,
      adaAmount: holdings.adaAmount,
      stableAmount: holdings.stableAmount,
      secondsSinceUpdate: 15,
      secondsSinceLastTransition: 900,
    };

    const step = applyExecution(holdings, scenario, draft, resolved.strategy);
    currentStage = step.nextStage;

    const currentLiquidValue = liquidValue(
      holdings.adaAmount,
      holdings.stableAmount,
      point.adaPrice,
      point.stablePrice,
      draft.haircutBps,
    );
    const currentStableRatio = stableRatio(
      holdings.adaAmount,
      holdings.stableAmount,
      point.adaPrice,
      point.stablePrice,
      draft.haircutBps,
    );

    minLiquidValueFiat = Math.min(minLiquidValueFiat, currentLiquidValue);
    maxStableRatio = Math.max(maxStableRatio, currentStableRatio);

    if (step.execution) {
      executions.push({
        ...step.execution,
        id: `${step.execution.kind}-${index}`,
        timestampMs: point.timestampMs,
      });
    }

    points.push({
      index,
      timestampMs: point.timestampMs,
      label: toLabel(point.timestampMs),
      adaPrice: point.adaPrice,
      adaEmaPrice: point.adaEmaPrice,
      adaConfidence: point.adaConfidence,
      stablePrice: point.stablePrice,
      referencePrice: point.referencePrice,
      stage: currentStage,
      liquidValueFiat: Number(currentLiquidValue.toFixed(2)),
      stableRatio: Number(currentStableRatio.toFixed(4)),
      trigger: step.trigger,
      executionLabel: step.execution
        ? `${step.execution.kind === "derisk_swap" ? "Sell ADA" : "Buy ADA"} via ${step.execution.routeId}`
        : undefined,
    });
  }

  const lastPoint = points[points.length - 1];

  return {
    points,
    executions,
    summary: {
      pointCount: points.length,
      executionCount: executions.length,
      minLiquidValueFiat: Number(minLiquidValueFiat.toFixed(2)),
      maxStableRatio: Number(maxStableRatio.toFixed(4)),
      finalStage: lastPoint?.stage ?? "normal",
      finalLiquidValueFiat: lastPoint?.liquidValueFiat ?? 0,
      finalStableRatio: lastPoint?.stableRatio ?? 0,
    },
  };
}
