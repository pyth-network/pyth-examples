import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SlippagePanelProps {
  pythPrice: number;
  dexPriceRef: React.MutableRefObject<number>;
  isTriggered: boolean;
}

export default function SlippagePanel({ pythPrice, dexPriceRef, isTriggered }: SlippagePanelProps) {
  const [sessionSavings, setSessionSavings] = useState(0);

  const dexPrice = dexPriceRef.current;
  const slippage = Math.abs(pythPrice - dexPrice);
  const slippagePct = (slippage / pythPrice) * 100;

  useEffect(() => {
    if (isTriggered && slippage > 0) {
      setSessionSavings((prev) => prev + slippage * 100); // Simula impacto en 100 ADA
    }
  }, [isTriggered, slippage]);

  return (
    <div className="curator-card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 className="text-editorial" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Market Intelligence</h3>
        <p className="text-muted">Real-time comparison between Pyth Lazer and on-chain DEX providers.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Comparison Card */}
        <div style={{ padding: "1.25rem", borderRadius: "16px", background: "var(--surface-container-low)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Pyth Lazer (HQ)</span>
            <span style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 700 }}>${pythPrice.toFixed(6)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--outline)" }}>Standard DEX</span>
            <span style={{ fontFamily: "monospace", color: "var(--outline)" }}>${dexPrice.toFixed(6)}</span>
          </div>
        </div>

        {/* Savings Insight */}
        <div style={{ padding: "1.25rem", borderRadius: "16px", background: "var(--surface-container-highest)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>
              Slippage Prevention
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span className="text-editorial" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>
                {slippagePct.toFixed(3)}%
              </span>
              <span className="text-muted">Optimized</span>
            </div>
          </div>
          {/* Subtle background glow */}
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", background: "var(--primary-container)", opacity: 0.15, borderRadius: "50%", filter: "blur(20px)" }} />
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid var(--surface-container)" }}>
        <p className="text-muted" style={{ marginBottom: "0.5rem" }}>Total Protection Impact</p>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={sessionSavings}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--on-background)" }}
          >
            ${sessionSavings.toFixed(2)} <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--outline)" }}>Saved</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ padding: "1rem", borderRadius: "12px", background: "rgba(101, 73, 192, 0.05)", border: "1px solid rgba(101, 73, 192, 0.1)" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600, lineHeight: 1.4 }}>
          "Using sub-second feeds ensures you exit before flash crash slippage occurs."
        </p>
      </div>
    </div>
  );
}
