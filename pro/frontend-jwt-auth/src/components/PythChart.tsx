"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import {
  candlesFromHistory,
  fetchHistory,
  type Candle,
} from "@/lib/pythClient";

const RESOLUTION_MINUTES = "1";
const HISTORY_WINDOW_SECONDS = 24 * 60 * 60;
const POLL_INTERVAL_MS = 30_000;

interface PythChartProps {
  symbol: string;
  label?: string;
  onUpdated?: (updatedAt: Date) => void;
}

function toChartCandle(c: Candle): {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
} {
  return {
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

export function PythChart({ symbol, label, onUpdated }: PythChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastBarTimeRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0e1015" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#1e222d" },
        horzLines: { color: "#1e222d" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
      },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const from = now - HISTORY_WINDOW_SECONDS;
        const history = await fetchHistory({
          symbol,
          from,
          to: now,
          resolution: RESOLUTION_MINUTES,
        });
        if (cancelled) return;

        const candles = candlesFromHistory(history).map(toChartCandle);
        const series = seriesRef.current;
        if (!series) return;
        series.setData(candles);
        if (candles.length > 0) {
          lastBarTimeRef.current = candles[candles.length - 1]!.time;
          chartRef.current?.timeScale().fitContent();
        }
        setError(null);
        onUpdated?.(new Date());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    const refresh = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        // Ask for the last two candles' worth of data so the current in-progress
        // candle overwrites cleanly via `series.update`.
        const from = now - Number.parseInt(RESOLUTION_MINUTES, 10) * 60 * 2;
        const history = await fetchHistory({
          symbol,
          from,
          to: now,
          resolution: RESOLUTION_MINUTES,
        });
        if (cancelled) return;

        const series = seriesRef.current;
        if (!series) return;
        const latest = candlesFromHistory(history);
        for (const candle of latest) {
          // `series.update` only accepts the last bar or newer ones; an
          // older bar throws "Cannot update oldest data".
          if (candle.time < lastBarTimeRef.current) continue;
          series.update(toChartCandle(candle));
          lastBarTimeRef.current = candle.time;
        }
        setError(null);
        onUpdated?.(new Date());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [symbol, onUpdated]);

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2 className="chart-card__title">{label ?? symbol}</h2>
      </div>
      <div className="chart-card__body" ref={containerRef} />
      {error && <p className="chart-card__error">{error}</p>}
    </div>
  );
}
