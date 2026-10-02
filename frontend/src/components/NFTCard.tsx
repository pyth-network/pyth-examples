// NFTCard.tsx
import { motion } from "framer-motion";

interface Props {
  entryPrice: number;
  currentPrice: number;
  amount: number;
}

const ff = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

export default function NFTCard({ entryPrice, currentPrice, amount }: Props) {
  const pnl = ((currentPrice - entryPrice) / entryPrice) * 100;
  const isProfit = pnl >= 0;
  const totalValue = currentPrice * amount;
  const pnlValue = (currentPrice - entryPrice) * amount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "24px",
        fontFamily: ff,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: isProfit
            ? "radial-gradient(circle, rgba(48,209,88,0.08) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(255,69,58,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: "#98989d",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            ADA Position
          </p>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#f5f5f7",
              letterSpacing: "-0.3px",
            }}
          >
            NFT Position
          </h2>
        </div>

        {/* PnL badge */}
        <div
          style={{
            background: isProfit
              ? "rgba(48,209,88,0.12)"
              : "rgba(255,69,58,0.12)",
            border: `1px solid ${isProfit ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`,
            borderRadius: 980,
            padding: "6px 14px",
            fontSize: 15,
            fontWeight: 600,
            color: isProfit ? "#30d158" : "#ff453a",
          }}
        >
          {isProfit ? "+" : ""}
          {pnl.toFixed(2)}%
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.06)",
          marginBottom: 20,
        }}
      />

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Entry Price", value: `$${entryPrice.toFixed(2)}` },
          { label: "Current Price", value: `$${currentPrice.toFixed(2)}` },
          { label: "Amount", value: `${amount} ADA` },
          { label: "Total Value", value: `$${totalValue.toFixed(2)}` },
          {
            label: "PnL (USD)",
            value: `${isProfit ? "+" : ""}$${pnlValue.toFixed(2)}`,
            accent: isProfit ? "#30d158" : "#ff453a",
          },
          { label: "Status", value: "● Active", accent: "#30d158" },
        ].map((stat) => (
          <div key={stat.label}>
            <p
              style={{
                fontSize: 11,
                color: "#98989d",
                marginBottom: 4,
                letterSpacing: "0.04em",
              }}
            >
              {stat.label}
            </p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: stat.accent ?? "#f5f5f7",
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Action button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 14,
          border: "1px solid rgba(255,69,58,0.3)",
          background: "rgba(255,69,58,0.1)",
          color: "#ff453a",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: ff,
          letterSpacing: "-0.1px",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,69,58,0.18)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(255,69,58,0.1)")
        }
      >
        Liquidate Position
      </motion.button>
    </motion.div>
  );
}
