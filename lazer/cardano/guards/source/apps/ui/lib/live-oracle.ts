import type { DemoState, OracleSnapshot } from "./types";

function formatOracleFreshness(nowMs: number, updatedAtMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - updatedAtMs) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

function computeDrawdownBps(price: number, emaPrice: number): number {
  if (emaPrice <= 0 || price >= emaPrice) {
    return 0;
  }

  return Math.round(((emaPrice - price) / emaPrice) * 10_000);
}

export function applyLiveOracleToDemoState(
  state: DemoState,
  oracle: OracleSnapshot,
): DemoState {
  const nowMs = Date.now();
  const stablePosition = state.positions.find((position) => position.role === "stable");
  const riskPosition = state.positions.find((position) => position.role === "risk");

  if (!riskPosition) {
    return {
      ...state,
      nowMs,
      oracle,
      metrics: {
        ...state.metrics,
        oracleFreshness: formatOracleFreshness(nowMs, oracle.updatedAtMs),
        drawdownBps: computeDrawdownBps(oracle.price, oracle.emaPrice),
      },
    };
  }

  const riskFiatValue = riskPosition.amount * oracle.price;
  const stableFiatValue = stablePosition?.fiatValue ?? 0;
  const liquidRiskValue = riskFiatValue * (1 - state.policy.haircutBps / 10_000);
  const liquidValue = liquidRiskValue + stableFiatValue;
  const stableRatio = liquidValue <= 0 ? 0 : stableFiatValue / liquidValue;
  const totalDisplayValue = riskFiatValue + stableFiatValue;

  const positions = state.positions.map((position) => {
    if (position.role === "risk") {
      const fiatValue = position.amount * oracle.price;
      return {
        ...position,
        fiatValue,
        weight: totalDisplayValue <= 0 ? 0 : fiatValue / totalDisplayValue,
      };
    }

    const fiatValue = position.fiatValue;
    return {
      ...position,
      fiatValue,
      weight: totalDisplayValue <= 0 ? 0 : fiatValue / totalDisplayValue,
    };
  });

  return {
    ...state,
    nowMs,
    oracle,
    positions,
    metrics: {
      liquidValue,
      stableRatio,
      drawdownBps: computeDrawdownBps(oracle.price, oracle.emaPrice),
      oracleFreshness: formatOracleFreshness(nowMs, oracle.updatedAtMs),
    },
  };
}
