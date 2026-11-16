import { useRef, useEffect, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
} from "lightweight-charts";
import { PriceDataPoint } from "../App";

interface TradingChartProps {
  data: PriceDataPoint[];
  threshold: number;
  isTriggered: boolean;
}

const ORACLE_DELAY = 6; // ticks (6 × 400ms = 2.4s de desventaja del oráculo estándar)

const TIMEFRAMES = [
  { label: "1m",  ticks: 150   },
  { label: "5m",  ticks: 750   },
  { label: "15m", ticks: 2250  },
  { label: "30m", ticks: 4500  },
  { label: "1H",  ticks: 9000  },
  { label: "4H",  ticks: 36000 },
  { label: "1D",  ticks: 216000},
] as const;

function getTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  return {
    bg:      isLight ? "#faf8ff" : "#0d0f1a",
    text:    isLight ? "#5e5a7a" : "#6b6b8a",
    grid:    isLight ? "rgba(149,130,220,0.18)" : "rgba(42,45,69,0.7)",
    border:  isLight ? "#d5cff0" : "#2a2d45",
    pyth:    isLight ? "#6549c0" : "#7c5cfa",
    oracle:  isLight ? "rgba(101,73,192,0.38)" : "rgba(180,160,255,0.38)",
    cross:   isLight ? "rgba(101,73,192,0.55)" : "rgba(124,92,250,0.55)",
    buyVol:  isLight ? "rgba(0,168,84,0.65)"   : "rgba(0,210,106,0.65)",
    sellVol: isLight ? "rgba(224,51,81,0.65)"  : "rgba(255,61,90,0.65)",
  };
}

function toTime(index: number): UTCTimestamp {
  // Use sequential index as time axis to avoid duplicate timestamps
  // (400ms interval → multiple points per second → crash if using wall-clock seconds)
  return index as UTCTimestamp;
}

export default function TradingChart({ data, threshold, isTriggered }: TradingChartProps) {
  const [activeTF, setActiveTF] = useState<string>("5m");

  const zoomToTF = (label: string, ticks: number) => {
    setActiveTF(label);
    const chart = priceChartRef.current;
    if (!chart || data.length === 0) return;
    const to   = data.length - 1;
    const from = Math.max(0, to - ticks);
    chart.timeScale().setVisibleRange({ from: from as UTCTimestamp, to: to as UTCTimestamp });
  };
  const priceRef  = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const priceChartRef  = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const pythRef        = useRef<ISeriesApi<"Line"> | null>(null);
  const oracleRef      = useRef<ISeriesApi<"Line"> | null>(null);
  const volRef         = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastIdxRef     = useRef(-1);

  useEffect(() => {
    if (!priceRef.current || !volumeRef.current) return;
    const t = getTheme();

    const sharedOpts = (h: number, withTime: boolean) => ({
      layout: {
        background: { type: ColorType.Solid, color: t.bg },
        textColor: t.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: t.grid, style: LineStyle.Dashed },
        horzLines: { color: t.grid, style: LineStyle.Dashed },
      },
      rightPriceScale: { borderColor: t.border },
      timeScale: {
        borderColor: t.border,
        timeVisible: withTime,
        secondsVisible: withTime,
        rightOffset: 8,
        barSpacing: 6,
      },
      height: h,
    });

    // Price chart
    const pc = createChart(priceRef.current, {
      ...sharedOpts(priceRef.current.clientHeight || 340, true),
      width: priceRef.current.clientWidth,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: t.cross, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.pyth },
        horzLine: { color: t.cross, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.pyth },
      },
    });
    priceChartRef.current = pc;

    // Oracle line — tenue, discontinued
    const oracleSeries = pc.addLineSeries({
      color: t.oracle,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    oracleRef.current = oracleSeries;

    // Pyth price line — sólido, primario
    const pythSeries = pc.addLineSeries({
      color: t.pyth,
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerRadius: 4,
    });
    pythRef.current = pythSeries;

    // Stop-loss price line
    pythSeries.createPriceLine({
      price: threshold,
      color: "rgba(255,61,90,0.75)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "Stop-Loss",
    });

    // Volume chart
    const vc = createChart(volumeRef.current, {
      ...sharedOpts(volumeRef.current.clientHeight || 160, false),
      width: volumeRef.current.clientWidth,
      crosshair: { mode: CrosshairMode.Hidden },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
    });
    volumeChartRef.current = vc;

    const volSeries = vc.addHistogramSeries({
      color: t.buyVol,
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    vc.priceScale("").applyOptions({ scaleMargins: { top: 0.05, bottom: 0 } });
    volRef.current = volSeries;

    // Sync time scales between charts
    pc.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) vc.timeScale().setVisibleLogicalRange(range);
    });
    vc.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) pc.timeScale().setVisibleLogicalRange(range);
    });

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (priceRef.current)  pc.applyOptions({ width: priceRef.current.clientWidth });
      if (volumeRef.current) vc.applyOptions({ width: volumeRef.current.clientWidth });
    });
    ro.observe(priceRef.current);
    ro.observe(volumeRef.current);

    // Theme sync (dark ↔ light)
    const mo = new MutationObserver(() => {
      const nt = getTheme();
      [pc, vc].forEach(chart => chart.applyOptions({
        layout: { background: { type: ColorType.Solid, color: nt.bg }, textColor: nt.text },
        grid: { vertLines: { color: nt.grid }, horzLines: { color: nt.grid } },
      }));
      pythSeries.applyOptions({ color: nt.pyth });
      oracleSeries.applyOptions({ color: nt.oracle });
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      ro.disconnect();
      mo.disconnect();
      pc.remove();
      vc.remove();
      priceChartRef.current = volumeChartRef.current = null;
      pythRef.current = oracleRef.current = volRef.current = null;
      lastIdxRef.current = -1;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Incremental updates (O(1) canvas paint per tick) ──
  useEffect(() => {
    if (!pythRef.current || !oracleRef.current || !volRef.current || data.length === 0) return;
    const t = getTheme();

    if (lastIdxRef.current === -1) {
      // Bulk initial load
      pythRef.current.setData(data.map((d, i) => ({ time: toTime(i), value: d.price })));
      oracleRef.current.setData(data.map((d, i) => ({
        time: toTime(i),
        value: data[Math.max(0, i - ORACLE_DELAY)].price,
      })));
      volRef.current.setData(data.map((d, i) => {
        const isBuy = d.price >= (data[Math.max(0, i - 1)]?.price ?? d.price);
        return { time: toTime(i), value: 50000 + Math.abs(Math.sin(i * 0.7)) * 80000, color: isBuy ? t.buyVol : t.sellVol };
      }));
      lastIdxRef.current = data.length - 1;
      priceChartRef.current?.timeScale().scrollToRealTime();
      return;
    }

    // Incremental update — only the new ticks
    for (let i = lastIdxRef.current + 1; i < data.length; i++) {
      const d    = data[i];
      const time = toTime(i);
      const isBuy = d.price >= (data[Math.max(0, i - 1)]?.price ?? d.price);
      pythRef.current.update({ time, value: d.price });
      oracleRef.current.update({ time, value: data[Math.max(0, i - ORACLE_DELAY)].price });
      volRef.current.update({ time, value: 50000 + Math.abs(Math.sin(i * 0.7)) * 80000, color: isBuy ? t.buyVol : t.sellVol });
    }
    lastIdxRef.current = data.length - 1;
  }, [data]);

  const latestPrice = data[data.length - 1]?.price ?? 0;
  const prevPrice   = data[data.length - 2]?.price ?? latestPrice;
  const delta = latestPrice - prevPrice;
  const pct   = prevPrice > 0 ? (delta / prevPrice) * 100 : 0;
  const isUp  = delta >= 0;

  // Pyth lead: cuántos ms de ventaja tiene Pyth sobre el oráculo estándar
  const pythLeadMs = ORACLE_DELAY * 400;
  const pythLeadPrice = data.length >= ORACLE_DELAY + 1
    ? latestPrice - data[data.length - 1 - ORACLE_DELAY].price
    : 0;

  return (
    <div className="chart-panel">

      {/* ── Barra superior: precio + leyendas ── */}
      <div className="chart-header">
        <div>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--on-surface)" }}>
            ADA / USD
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.1rem" }}>
            <span className="price-tag" style={{ color: isTriggered ? "var(--sell)" : "var(--on-background)" }}>
              ${latestPrice.toFixed(6)}
            </span>
            <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: isUp ? "var(--buy)" : "var(--sell)" }}>
              {isUp ? "▲" : "▼"} {pct.toFixed(4)}%
            </span>
            {isTriggered && (
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sell)", background: "var(--sell-container)", padding: "0.1rem 0.5rem", borderRadius: "4px" }}>
                ⚠ STOP-LOSS ACTIVO
              </span>
            )}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div className="chart-legend-item">
            <div className="legend-line" style={{ background: "var(--chart-pyth)" }} />
            <span>Precio Pyth</span>
          </div>
          <div className="chart-legend-item">
            <div className="legend-line" style={{ borderTop: "1px dashed var(--chart-oracle)", height: "1px" }} />
            <span>Oráculo (retardado)</span>
          </div>

          {/* ⚡ Ventaja de velocidad Pyth */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.35rem",
            padding: "0.2rem 0.6rem",
            background: "rgba(124,92,250,0.12)",
            border: "1px solid rgba(124,92,250,0.35)",
            borderRadius: "20px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            color: "var(--chart-pyth)",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--chart-pyth)", boxShadow: "0 0 6px var(--chart-pyth)", animation: "pulse 1.2s ease-in-out infinite", flexShrink: 0 }} />
            <span style={{ fontWeight: 700 }}>⚡ {pythLeadMs}ms</span>
            <span style={{ color: "var(--on-surface)", fontWeight: 400 }}>adelanto vs oráculo</span>
            {pythLeadPrice !== 0 && (
              <span style={{ color: pythLeadPrice > 0 ? "var(--buy)" : "var(--sell)", fontWeight: 600 }}>
                ({pythLeadPrice > 0 ? "+" : ""}{pythLeadPrice.toFixed(4)})
              </span>
            )}
          </div>

          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "0.2rem 0.5rem", background: "var(--surface-container)", borderRadius: "4px", color: "var(--on-surface)" }}>
            Canvas · 60fps
          </span>
        </div>
      </div>

      {/* ── Pills de temporalidad ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        padding: "0.45rem 1rem",
        borderBottom: "1px solid var(--outline)",
        flexShrink: 0,
      }}>
        {TIMEFRAMES.map(({ label, ticks }) => (
          <button
            key={label}
            onClick={() => zoomToTF(label, ticks)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              fontWeight: activeTF === label ? 700 : 500,
              padding: "0.2rem 0.6rem",
              borderRadius: "20px",
              border: activeTF === label ? "1px solid var(--chart-pyth)" : "1px solid transparent",
              background: activeTF === label ? "rgba(124,92,250,0.15)" : "transparent",
              color: activeTF === label ? "var(--chart-pyth)" : "var(--on-surface)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              letterSpacing: "0.04em",
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "0.65rem", color: "var(--on-surface)", fontFamily: "var(--font-mono)", opacity: 0.6 }}>
          {data.length} ticks · ~{(data.length * 0.4 / 60).toFixed(1)} min de datos
        </span>
      </div>

      {/* Price chart — 65% */}
      <div ref={priceRef} style={{ flex: "65", minHeight: 0, width: "100%" }} />

      <div style={{ height: "1px", background: "var(--outline)", flexShrink: 0 }} />

      {/* Volume histogram — 35% */}
      <div ref={volumeRef} style={{ flex: "35", minHeight: 0, width: "100%" }} />
    </div>
  );
}
