import type {
  OracleSnapshot,
  PolicyConfig,
  PortfolioMetrics,
  RiskStage,
  TreasuryPosition,
} from "./types.js";

export const STAGE_SEVERITY = {
  normal: 0,
  watch: 1,
  partial_derisk: 2,
  full_exit: 3,
  frozen: 4,
} as const;

export function stageAtLeast(
  current: RiskStage,
  target: RiskStage,
): boolean {
  return STAGE_SEVERITY[current] >= STAGE_SEVERITY[target];
}

export function stageMax(left: RiskStage, right: RiskStage): RiskStage {
  return STAGE_SEVERITY[left] >= STAGE_SEVERITY[right] ? left : right;
}

export function toDecimalPrice(snapshot: OracleSnapshot): number {
  return snapshot.price * 10 ** snapshot.exponent;
}

export function toDecimalEma(snapshot: OracleSnapshot): number {
  return snapshot.emaPrice * 10 ** snapshot.exponent;
}

export function confidenceBps(snapshot: OracleSnapshot): number {
  const price = Math.abs(toDecimalPrice(snapshot));
  if (price === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (snapshot.confidence * 10 ** snapshot.exponent) / price * 10_000;
}

export function isSnapshotStale(
  snapshot: OracleSnapshot,
  nowUs: number,
  maxStaleUs: number,
): boolean {
  return nowUs - snapshot.feedUpdateTimestampUs > maxStaleUs;
}

export function computeDrawdownBps(snapshot: OracleSnapshot): number {
  const price = toDecimalPrice(snapshot);
  const ema = toDecimalEma(snapshot);
  if (ema <= 0 || price >= ema) {
    return 0;
  }

  return ((ema - price) / ema) * 10_000;
}

export function applyHaircut(value: number, haircutBps: number): number {
  return value * (1 - haircutBps / 10_000);
}

export function computePositionLiquidValue(
  position: TreasuryPosition,
  snapshot: OracleSnapshot | undefined,
  policy: PolicyConfig,
): number {
  if (position.role === "stable") {
    if (!snapshot) {
      return position.amount;
    }

    return position.amount * toDecimalPrice(snapshot);
  }

  if (!snapshot) {
    return 0;
  }

  const price = toDecimalPrice(snapshot);
  return applyHaircut(position.amount * price, policy.haircutBps);
}

export function summarizePortfolio(
  positions: TreasuryPosition[],
  snapshots: Record<string, OracleSnapshot>,
  policy: PolicyConfig,
): PortfolioMetrics {
  const assetLiquidValues: Record<string, number> = {};
  const priceMap: Record<string, number> = {};
  let totalLiquidValueFiat = 0;
  let stableLiquidValueFiat = 0;
  let riskLiquidValueFiat = 0;
  let drawdownBps = 0;

  for (const position of positions) {
    const snapshot = snapshots[position.assetId];
    const liquidValue = computePositionLiquidValue(position, snapshot, policy);
    assetLiquidValues[position.assetId] =
      (assetLiquidValues[position.assetId] ?? 0) + liquidValue;

    if (snapshot) {
      priceMap[position.assetId] = toDecimalPrice(snapshot);
    } else if (position.role === "stable") {
      priceMap[position.assetId] = 1;
    }

    totalLiquidValueFiat += liquidValue;
    if (position.role === "stable") {
      stableLiquidValueFiat += liquidValue;
    } else {
      riskLiquidValueFiat += liquidValue;
      if (position.assetId === policy.primaryAssetId && snapshot) {
        drawdownBps = computeDrawdownBps(snapshot);
      }
    }
  }

  const stableRatio =
    totalLiquidValueFiat === 0 ? 0 : stableLiquidValueFiat / totalLiquidValueFiat;

  return {
    totalLiquidValueFiat,
    stableLiquidValueFiat,
    riskLiquidValueFiat,
    stableRatio,
    drawdownBps,
    assetLiquidValues,
    priceMap,
  };
}
