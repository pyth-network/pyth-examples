import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "./demo-data";
import {
  applyLiveQuotesToDemoState,
  liveReferencePriceForSymbol,
  type LiveQuoteMap,
} from "./live-prices";
import type { DemoState } from "./types";

const nowMs = Date.parse("2026-03-22T19:00:00.000Z");

function cloneState(): DemoState {
  return {
    ...demoState,
    positions: demoState.positions.map((position) => ({ ...position })),
    oracle: { ...demoState.oracle },
    policy: { ...demoState.policy },
    metrics: { ...demoState.metrics },
  };
}

describe("applyLiveQuotesToDemoState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("is a no-op when there is no ADA quote", () => {
    const state = cloneState();
    expect(applyLiveQuotesToDemoState(state, {})).toEqual(state);
  });

  it("rejects stale or low-confidence quotes using policy guardrails", () => {
    const staleQuote: LiveQuoteMap = {
      ada: {
        ...stateOracle(),
        updatedAtMs: nowMs - demoState.policy.maxStaleUs / 1000 - 1,
      },
    };
    const wideConfidenceQuote: LiveQuoteMap = {
      ada: {
        ...stateOracle(),
        confidence: 0.01,
      },
    };

    expect(applyLiveQuotesToDemoState(cloneState(), staleQuote)).toEqual(cloneState());
    expect(applyLiveQuotesToDemoState(cloneState(), wideConfidenceQuote)).toEqual(cloneState());
  });

  it("recomputes liquid value, stable ratio, and weights when ADA price changes", () => {
    const state = applyLiveQuotesToDemoState(cloneState(), {
      ada: {
        ...stateOracle(),
        price: 0.25,
        emaPrice: 0.3,
      },
    });

    const riskPosition = state.positions.find((position) => position.role === "risk");
    const stablePosition = state.positions.find((position) => position.role === "stable");

    expect(riskPosition?.fiatValue).toBeCloseTo(31_250, 6);
    expect(riskPosition?.weight).toBeCloseTo(31_250 / 68_750, 6);
    expect(stablePosition?.weight).toBeCloseTo(37_500 / 68_750, 6);
    expect(state.metrics.liquidValue).toBeCloseTo(68_281.25, 6);
    expect(state.metrics.stableRatio).toBeCloseTo(37_500 / 68_281.25, 6);
    expect(state.metrics.drawdownBps).toBe(1667);
  });

  it("returns guarded live reference prices by symbol", () => {
    const quotes: LiveQuoteMap = {
      xau: {
        feedId: "pyth-xau-usd",
        symbol: "XAU/USD",
        price: 4405.12,
        emaPrice: 4398,
        confidence: 0.35,
        updatedAtMs: nowMs - 1_000,
        publisherCount: 12,
      },
      btc: {
        feedId: "pyth-btc-usd",
        symbol: "BTC/USD",
        price: 84500,
        emaPrice: 84400,
        confidence: 4,
        updatedAtMs: nowMs - 1_000,
        publisherCount: 12,
      },
    };

    expect(
      liveReferencePriceForSymbol(quotes, "XAU/USD", {
        maxStaleUs: demoState.policy.maxStaleUs,
        maxConfidenceBps: demoState.policy.maxConfidenceBps,
      }),
    ).toBeCloseTo(4405.12, 6);
    expect(
      liveReferencePriceForSymbol(quotes, "BTC/USD", {
        maxStaleUs: demoState.policy.maxStaleUs,
        maxConfidenceBps: demoState.policy.maxConfidenceBps,
      }),
    ).toBeCloseTo(84500, 6);
    expect(
      liveReferencePriceForSymbol(quotes, "EUR/USD", {
        maxStaleUs: demoState.policy.maxStaleUs,
        maxConfidenceBps: demoState.policy.maxConfidenceBps,
      }),
    ).toBeUndefined();
  });

  it("rejects stale reference quotes", () => {
    const quotes: LiveQuoteMap = {
      xau: {
        feedId: "pyth-xau-usd",
        symbol: "XAU/USD",
        price: 4405.12,
        emaPrice: 4398,
        confidence: 0.35,
        updatedAtMs: nowMs - demoState.policy.maxStaleUs / 1000 - 1,
        publisherCount: 12,
      },
    };

    expect(
      liveReferencePriceForSymbol(quotes, "XAU/USD", {
        maxStaleUs: demoState.policy.maxStaleUs,
        maxConfidenceBps: demoState.policy.maxConfidenceBps,
      }),
    ).toBeUndefined();
  });
});

function stateOracle() {
  return {
    feedId: "pyth-ada-usd",
    symbol: "ADA/USD",
    price: 0.252,
    emaPrice: 0.251,
    confidence: 0.00004,
    updatedAtMs: nowMs - 1_000,
    publisherCount: 12,
  };
}
