import { useState, useRef } from "react";
import { AlertTriangle, Zap } from "lucide-react";

interface OrderPanelProps {
  currentPrice: number;
  isTriggered: boolean;
  savedSlippage: number;
  savedSlippageUsd: number;
}

export default function OrderPanel({ currentPrice, isTriggered, savedSlippage, savedSlippageUsd }: OrderPanelProps) {
  const [tab, setTab] = useState<"market" | "limit">("market");
  const [stopLossActive, setStopLossActive] = useState(false);
  const [execPrice, setExecPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("0.350000");
  const [panicConfirm, setPanicConfirm] = useState(false);
  const panicTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayPrice = tab === "market" ? currentPrice : parseFloat(execPrice) || currentPrice;
  const qty          = parseFloat(quantity) || 0;
  const totalUsd     = (qty * displayPrice).toFixed(2);

  const handlePanic = () => {
    if (!panicConfirm) {
      setPanicConfirm(true);
      panicTimeout.current = setTimeout(() => setPanicConfirm(false), 3000);
    } else {
      if (panicTimeout.current) clearTimeout(panicTimeout.current);
      setPanicConfirm(false);
      // Aquí iría la lógica real de cierre de posiciones
      alert("Saliendo de todas las posiciones...");
    }
  };

  return (
    <aside className="order-panel">
      {/* Entrada de Órdenes */}
      <div className="order-section">
        <p className="section-title">Entrada de Órdenes</p>

        {/* Tabs Mercado / Límite */}
        <div className="tab-group">
          <button className={`tab-btn ${tab === "market" ? "active" : ""}`} onClick={() => setTab("market")}>
            Mercado
          </button>
          <button className={`tab-btn ${tab === "limit" ? "active" : ""}`} onClick={() => setTab("limit")}>
            Límite
          </button>
        </div>

        {/* Precio de Ejecución */}
        <div className="input-group">
          <label className="input-label">Precio de Ejecución</label>
          {tab === "market" ? (
            <div className="input-field" style={{ color: "var(--on-surface)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--on-background)", fontSize: "0.9rem" }}>
                ${currentPrice.toFixed(6)}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--primary-light)", background: "var(--primary-container)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                MERCADO
              </span>
            </div>
          ) : (
            <input
              className="input-field"
              type="number"
              step="0.000001"
              placeholder={currentPrice.toFixed(6)}
              value={execPrice}
              onChange={e => setExecPrice(e.target.value)}
            />
          )}
        </div>

        {/* Cantidad */}
        <div className="input-group">
          <label className="input-label">Cantidad de Activo (ADA)</label>
          <input
            className="input-field"
            type="number"
            step="1"
            min="0"
            placeholder="0.00"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
        </div>

        {/* Total estimado */}
        {qty > 0 && (
          <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "var(--surface-container)", borderRadius: "var(--radius-sm)",
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--on-surface)" }}>Total estimado</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.9rem" }}>${totalUsd}</span>
          </div>
        )}

        {/* Botones Comprar / Vender */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-buy" style={{ flex: 1 }}>
            Comprar a ${displayPrice.toFixed(4)}
          </button>
          <button className="btn-sell" style={{ flex: 1 }}>
            Vender a ${displayPrice.toFixed(4)}
          </button>
        </div>
      </div>

      {/* Módulo Pyth-Guard — Stop-Loss de Alta Precisión */}
      <div className="order-section">
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
          <Zap size={14} color="var(--primary)" />
          <p className="section-title" style={{ margin: 0 }}>Módulo Pyth-Guard</p>
        </div>

        <div className="switch-row" style={{ marginBottom: "0.75rem" }}>
          <div>
            <p className="switch-label">Stop-Loss de Alta Precisión</p>
            <p className="switch-sub">Precio en tiempo real: feed Pyth Lazer 400ms</p>
          </div>
          <label className="neon-switch">
            <input type="checkbox" checked={stopLossActive} onChange={e => setStopLossActive(e.target.checked)} />
            <span className="neon-slider" />
          </label>
        </div>

        {stopLossActive && (
          <div className="input-group">
            <label className="input-label">Precio de Stop-Loss</label>
            <input
              className="input-field"
              type="number"
              step="0.000001"
              value={stopLossPrice}
              onChange={e => setStopLossPrice(e.target.value)}
            />
            {isTriggered && (
              <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--sell)", fontSize: "0.75rem" }}>
                <AlertTriangle size={12} />
                <span>¡Stop-Loss activado! Precio por debajo del umbral.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Widget de Rendimiento */}
      <div className="order-section">
        <p className="section-title">Rendimiento con Pyth</p>
        <div className="performance-widget">
          <p className="perf-label">Slippage ahorrado con Pyth</p>
          <p className="perf-value">
            {savedSlippage.toFixed(3)}% (${savedSlippageUsd.toFixed(4)})
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--on-surface)", marginTop: "0.4rem" }}>
            vs Oráculo Estándar — sesión actual
          </p>
        </div>

        {/* Botón de Pánico */}
        <button
          className="btn-panic"
          onClick={handlePanic}
          style={panicConfirm ? { background: "var(--sell)", color: "#fff" } : undefined}
        >
          {panicConfirm ? "⚠️ ¿Confirmar salida total?" : "🚨 Salir de Todas las Posiciones"}
        </button>
        {panicConfirm && (
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--on-surface)", marginTop: "0.4rem" }}>
            Hacé clic de nuevo para confirmar. Se cancela en 3s.
          </p>
        )}
      </div>
    </aside>
  );
}
