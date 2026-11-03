import { motion, AnimatePresence } from "framer-motion";

interface SafetyIndicatorProps {
  isStopLossTriggered: boolean;
  currentPrice: number;
  threshold: number;
}

export default function SafetyIndicator({
  isStopLossTriggered,
  currentPrice,
  threshold,
}: SafetyIndicatorProps) {
  const statusLabel = isStopLossTriggered ? "Target Reached" : "Safe Zone";
  const statusDesc  = isStopLossTriggered 
    ? "Protective action taken to secure your assets." 
    : "Your portfolio is currently within the safe market range.";
  
  return (
    <div className="curator-card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", background: "var(--surface-container-low)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className="text-editorial" style={{ fontSize: "1.25rem" }}>Security Status</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className={`status-orb ${isStopLossTriggered ? "status-danger" : "status-safe"}`}></span>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: isStopLossTriggered ? "var(--error)" : "var(--primary)" }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div style={{ position: "relative", height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          {!isStopLossTriggered ? (
            <motion.div
              key="safe"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "radial-gradient(circle, var(--primary-container) 0%, transparent 70%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
              }}
            >
              🛡️
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  position: "absolute",
                  inset: -20,
                  borderRadius: "50%",
                  border: "2px solid var(--primary-container)",
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="triggered"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "radial-gradient(circle, var(--error-container) 0%, transparent 70%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
              }}
            >
              ⚠️
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{
                  position: "absolute",
                  inset: -20,
                  borderRadius: "50%",
                  border: "2px solid var(--error-container)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ textAlign: "center" }}>
        <p className="text-editorial" style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          {statusLabel}
        </p>
        <p className="text-muted">
          {statusDesc}
        </p>
      </div>

      <div style={{ marginTop: "1rem", paddingTop: "1.5rem", borderTop: "1px solid var(--surface-container)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          <span className="text-muted">Current Deviation</span>
          <span style={{ fontWeight: 700, color: isStopLossTriggered ? "var(--error)" : "var(--primary)" }}>
            {((currentPrice / threshold - 1) * 100).toFixed(2)}%
          </span>
        </div>
        <div style={{ width: "100%", height: 6, background: "var(--surface-container)", borderRadius: 3, overflow: "hidden" }}>
          <motion.div
            initial={false}
            animate={{ width: `${Math.max(0, Math.min(100, (currentPrice / threshold) * 50))}%` }}
            style={{ height: "100%", background: isStopLossTriggered ? "var(--error)" : "var(--primary)" }}
          />
        </div>
      </div>
    </div>
  );
}
