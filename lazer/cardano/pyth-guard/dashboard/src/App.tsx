import { useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import AnalysisSidebar from "./components/AnalysisSidebar";
import TradingChart from "./components/TradingChart";
import OrderPanel from "./components/OrderPanel";

// ============================================================
// TIPOS
// ============================================================

export interface PriceDataPoint {
  time: string;
  price: number;
  timestamp: number;
}

// ============================================================
// CONSTANTES
// ============================================================

const STOP_LOSS_THRESHOLD = 0.35;
const UPDATE_INTERVAL_MS  = 400;
const HISTORY_WINDOW      = 80;
const DEX_DELAY_POINTS    = 6; // puntos de delay para el oráculo estándar

// ============================================================
// SIMULACIÓN DE PRECIO ADA/USD
// ============================================================

function generateMockPrice(prev: number): number {
  const t      = Date.now() / 10000;
  const sine   = Math.sin(t * 0.7) * 0.045;
  const noise  = (Math.random() - 0.5) * 0.004;
  const spike  = Math.random() < 0.015 ? -(STOP_LOSS_THRESHOLD * 0.12) : 0;
  return parseFloat(Math.max(0.28, Math.min(0.48, prev + sine * 0.03 + noise + spike)).toFixed(6));
}

// ============================================================
// APP — TRADING TERMINAL
// ============================================================

export default function App() {
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0.382);
  const [isTriggered, setIsTriggered]   = useState(false);
  const [isLive, setIsLive]             = useState(true);
  const [savedSlippage, setSavedSlippage] = useState(0);
  const [savedSlippageUsd, setSavedSlippageUsd] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceRef    = useRef(0.382);

  const tick = useCallback(() => {
    const newPrice = generateMockPrice(priceRef.current);
    priceRef.current = newPrice;

    const now   = Date.now();
    const point: PriceDataPoint = {
      time: new Date(now).toLocaleTimeString("es-AR", { hour12: false }),
      price: newPrice,
      timestamp: now,
    };

    setPriceHistory(prev => {
      const next = [...prev, point].slice(-HISTORY_WINDOW);
      // Calcular slippage acumulado vs oráculo retrasado
      if (next.length > DEX_DELAY_POINTS) {
        const oraclePrice = next[next.length - 1 - DEX_DELAY_POINTS].price;
        const diff = Math.abs(newPrice - oraclePrice);
        const pct  = oraclePrice > 0 ? (diff / oraclePrice) * 100 : 0;
        setSavedSlippage(prev => prev + pct * 0.1);  // acumulado de sesión
        setSavedSlippageUsd(prev => prev + diff * 100); // ADA * diferencia
      }
      return next;
    });

    setCurrentPrice(newPrice);
    setIsTriggered(newPrice <= STOP_LOSS_THRESHOLD);
    setIsLive(true);
  }, []);

  useEffect(() => {
    // Datos iniciales
    const initial: PriceDataPoint[] = Array.from({ length: 40 }, (_, i) => {
      const t = Date.now() - (40 - i) * UPDATE_INTERVAL_MS;
      return {
        time: new Date(t).toLocaleTimeString("es-AR", { hour12: false }),
        price: 0.382 + (Math.random() - 0.5) * 0.03,
        timestamp: t,
      };
    });
    setPriceHistory(initial);
    priceRef.current = initial[initial.length - 1].price;

    intervalRef.current = setInterval(tick, UPDATE_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tick]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* ── Header completo ── */}
      <Header currentPrice={currentPrice} isLive={isLive} />

      {/* ── Cuerpo principal ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar de análisis */}
        <AnalysisSidebar />

        {/* Gráfico de trading central */}
        <TradingChart
          data={priceHistory}
          threshold={STOP_LOSS_THRESHOLD}
          isTriggered={isTriggered}
        />

        {/* Panel de operaciones */}
        <OrderPanel
          currentPrice={currentPrice}
          isTriggered={isTriggered}
          savedSlippage={savedSlippage}
          savedSlippageUsd={savedSlippageUsd}
        />
      </div>
    </div>
  );
}
