import { createChart, LineSeries, CandlestickSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { subscribeWithHistory, getPriceHistory } from "../services/pythService";

type ChartType = "line" | "candle";

const ff = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

// Genera velas OHLC a partir del historial de precios
const buildCandles = (history: { time: number; value: number }[]) => {
  const candles: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[] = [];

  for (let i = 0; i < history.length; i += 3) {
    const chunk = history.slice(i, i + 3);
    if (chunk.length === 0) continue;

    const open = chunk[0].value;
    const close = chunk[chunk.length - 1].value;
    const high =
      Math.max(...chunk.map((p) => p.value)) * (1 + Math.random() * 0.002);
    const low =
      Math.min(...chunk.map((p) => p.value)) * (1 - Math.random() * 0.002);

    candles.push({
      time: chunk[0].time,
      open: +open.toFixed(4),
      high: +high.toFixed(4),
      low: +low.toFixed(4),
      close: +close.toFixed(4),
    });
  }

  return candles;
};

export default function Chart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<
    ISeriesApi<"Line"> | ISeriesApi<"Candlestick"> | null
  >(null);
  const [chartType, setChartType] = useState<ChartType>("line");
  const chartTypeRef = useRef<ChartType>("line");

  const initChart = (type: ChartType) => {
    if (!ref.current) return;
    const container = ref.current;

    // Destruir chart anterior
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 240,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255,255,255,0.4)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#1c1c1e",
        },
        horzLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#1c1c1e",
        },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const history = getPriceHistory();

    if (type === "line") {
      const series = chart.addSeries(LineSeries, {
        color: "#0071e3",
        lineWidth: 2,
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: "#0071e3",
        crosshairMarkerBorderColor: "#fff",
        lastValueVisible: true,
        priceLineVisible: false,
      });
      series.setData(history as unknown as { time: Time; value: number }[]);
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#30d158",
        downColor: "#ff453a",
        borderUpColor: "#30d158",
        borderDownColor: "#ff453a",
        wickUpColor: "#30d158",
        wickDownColor: "#ff453a",
      });
      const candles = buildCandles(history);
      series.setData(candles as unknown as { time: Time }[]);
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      chartRef.current?.applyOptions({ width: container.clientWidth });
    });
    observer.observe(container);

    return () => observer.disconnect();
  };

  // Init inicial
  useEffect(() => {
    const cleanup = initChart(chartType);
    return () => {
      cleanup?.();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Reinit cuando cambia el tipo
  useEffect(() => {
    chartTypeRef.current = chartType;
    initChart(chartType);
  }, [chartType]);

  // Suscripción a precios en tiempo real
  useEffect(() => {
    const unsub = subscribeWithHistory(() => {
      const latest = getPriceHistory();
      const last = latest[latest.length - 1];
      if (!last || !seriesRef.current) return;

      try {
        if (chartTypeRef.current === "line") {
          (seriesRef.current as ISeriesApi<"Line">).update({
            time: last.time as unknown as Time,
            value: last.value,
          });
        } else {
          const candles = buildCandles(latest);
          const lastCandle = candles[candles.length - 1];
          if (lastCandle) {
            (seriesRef.current as ISeriesApi<"Candlestick">).update(
              lastCandle as unknown as { time: Time },
            );
          }
        }
      } catch {
        // Si hay error de tiempo, recargar serie completa
        const history = getPriceHistory();
        if (chartTypeRef.current === "line") {
          (seriesRef.current as ISeriesApi<"Line">).setData(
            history as unknown as { time: Time; value: number }[],
          );
        } else {
          (seriesRef.current as ISeriesApi<"Candlestick">).setData(
            buildCandles(history) as unknown as { time: Time }[],
          );
        }
      }
    });

    return unsub;
  }, []);

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["line", "candle"] as ChartType[]).map((type) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: 980,
              border:
                chartType === type
                  ? "1px solid rgba(0,113,227,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
              background:
                chartType === type
                  ? "rgba(0,113,227,0.15)"
                  : "rgba(255,255,255,0.04)",
              color: chartType === type ? "#0071e3" : "#98989d",
              fontSize: 13,
              fontWeight: chartType === type ? 600 : 400,
              cursor: "pointer",
              fontFamily: ff,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 15 }}>{type === "line" ? "〜" : "▮"}</span>
            {type === "line" ? "Line" : "Candles"}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div
        ref={ref}
        style={{ width: "100%", borderRadius: 12, overflow: "hidden" }}
      />
    </div>
  );
}
