import type { DemoState, OracleSnapshot } from "./types";

export interface LiveQuote extends OracleSnapshot {}

export interface LiveQuoteMap {
  ada?: LiveQuote;
  xau?: LiveQuote;
  btc?: LiveQuote;
  sol?: LiveQuote;
  eur?: LiveQuote;
}

interface OracleGuardrails {
  maxStaleUs: number;
  maxConfidenceBps: number;
}

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

function computeConfidenceBps(price: number, confidence: number): number {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(confidence) || confidence < 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (confidence / price) * 10_000;
}

function quotePassesGuardrails(
  quote: LiveQuote,
  guardrails: OracleGuardrails,
  nowMs = Date.now(),
): boolean {
  const updatedAgoMs = Math.max(0, nowMs - quote.updatedAtMs);
  const confidenceBps = computeConfidenceBps(quote.price, quote.confidence);

  if (guardrails.maxStaleUs > 0 && updatedAgoMs > guardrails.maxStaleUs / 1000) {
    return false;
  }

  if (
    guardrails.maxConfidenceBps > 0 &&
    confidenceBps > guardrails.maxConfidenceBps
  ) {
    return false;
  }

  return true;
}

export function applyLiveQuotesToDemoState(
  state: DemoState,
  quotes: LiveQuoteMap,
): DemoState {
  const ada = quotes.ada;
  if (!ada) {
    return state;
  }

  const nowMs = Date.now();
  if (!quotePassesGuardrails(ada, state.policy, nowMs)) {
    return state;
  }

  const stablePosition = state.positions.find((position) => position.role === "stable");
  const riskPosition = state.positions.find((position) => position.role === "risk");

  if (!riskPosition) {
    return {
      ...state,
      nowMs,
      oracle: ada,
      metrics: {
        ...state.metrics,
        drawdownBps: computeDrawdownBps(ada.price, ada.emaPrice),
        oracleFreshness: formatOracleFreshness(nowMs, ada.updatedAtMs),
      },
    };
  }

  const stableFiatValue = stablePosition?.fiatValue ?? 0;
  const riskFiatValue = riskPosition.amount * ada.price;
  const liquidRiskValue = riskFiatValue * (1 - state.policy.haircutBps / 10_000);
  const liquidValue = liquidRiskValue + stableFiatValue;
  const stableRatio = liquidValue <= 0 ? 0 : stableFiatValue / liquidValue;
  const totalDisplayValue = riskFiatValue + stableFiatValue;

  return {
    ...state,
    nowMs,
    oracle: ada,
    positions: state.positions.map((position) => {
      if (position.role === "risk") {
        const fiatValue = position.amount * ada.price;
        return {
          ...position,
          fiatValue,
          weight: totalDisplayValue <= 0 ? 0 : fiatValue / totalDisplayValue,
        };
      }

      return {
        ...position,
        weight: totalDisplayValue <= 0 ? 0 : position.fiatValue / totalDisplayValue,
      };
    }),
    metrics: {
      liquidValue,
      stableRatio,
      drawdownBps: computeDrawdownBps(ada.price, ada.emaPrice),
      oracleFreshness: formatOracleFreshness(nowMs, ada.updatedAtMs),
    },
  };
}

export function liveReferencePriceForSymbol(
  quotes: LiveQuoteMap,
  symbol: string,
  guardrails?: OracleGuardrails,
): number | undefined {
  const quote = (() => {
  switch (symbol) {
    case "XAU/USD":
        return quotes.xau;
    case "BTC/USD":
        return quotes.btc;
    case "SOL/USD":
        return quotes.sol;
    case "EUR/USD":
        return quotes.eur;
    default:
        return undefined;
    }
  })();

  if (!quote) {
    return undefined;
  }

  if (guardrails && !quotePassesGuardrails(quote, guardrails)) {
    return undefined;
  }

  return quote.price;
}
