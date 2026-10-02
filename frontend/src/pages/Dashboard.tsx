import Wallet from "../components/Wallet";
import Chart from "../components/Chart";
import NFTCard from "../components/NFTCard";
import { subscribe, getPrice } from "../services/pythService";
import { useState, useEffect } from "react";
import { useWallet } from "@meshsdk/react";
import { buildMintTx } from "../tx/mint";
import { buildBurnTx } from "../tx/burn";
import { buildLiquidateTx } from "../tx/liquidate";
import { computeLovelacesForSynth } from "../tx/contract";

const ff =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif";

const API_URL = import.meta.env.VITE_API_URL as string;
const BLOCKFROST_KEY = import.meta.env.VITE_BLOCKFROST_KEY as string;
console.log(BLOCKFROST_KEY);

export default function Dashboard() {
  const { connected, wallet } = useWallet();
  const [price, setPrice] = useState(getPrice());
  const [priceDir, setPriceDir] = useState<"up" | "down" | null>(null);

  // Mint modal state
  const [mintOpen, setMintOpen] = useState(false);
  const [adaInput, setAdaInput] = useState("");
  const [cropInput, setCropInput] = useState("");
  const [mintLoading, setMintLoading] = useState(false);
  const [mintResult, setMintResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Burn modal state
  const [burnOpen, setBurnOpen] = useState(false);
  const [synthInput, setSynthInput] = useState("");
  const [burnLoading, setBurnLoading] = useState(false);
  const [burnResult, setBurnResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Liquidate modal state
  const [liquidateOpen, setLiquidateOpen] = useState(false);
  const [liquidateSynthInput, setLiquidateSynthInput] = useState("");
  const [liquidateLoading, setLiquidateLoading] = useState(false);
  const [liquidateResult, setLiquidateResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleLiquidate = async () => {
    const synthFloat = parseFloat(liquidateSynthInput);
    if (!synthFloat || synthFloat <= 0) return;

    setLiquidateLoading(true);
    setLiquidateResult(null);

    try {
      const res = await fetch(`${API_URL}/api/get-adaprice`);
      const data = await res.json();
      const pythHex: string = data.solanaPayload;
      const adaUsdPrice: number = data.price;

      const synthMicro = BigInt(Math.round(synthFloat * 1_000_000));

      const txHash = await buildLiquidateTx(wallet as any, synthMicro, pythHex, adaUsdPrice, BLOCKFROST_KEY);

      setLiquidateResult({ ok: true, msg: `Tx enviada: ${txHash}` });
    } catch (e: any) {
      console.error("[handleLiquidate] error:", e);
      if (e?.info) console.error("[handleLiquidate] node error info:", JSON.stringify(e.info));
      if (e?.data) console.error("[handleLiquidate] error data:", JSON.stringify(e.data));
      setLiquidateResult({ ok: false, msg: e?.info ?? e.message ?? "Error desconocido" });
    } finally {
      setLiquidateLoading(false);
    }
  };

  const handleBurn = async () => {
    const synthFloat = parseFloat(synthInput);
    if (!synthFloat || synthFloat <= 0) return;

    setBurnLoading(true);
    setBurnResult(null);

    try {
      const res = await fetch(`${API_URL}/api/get-adaprice`);
      const data = await res.json();
      const pythHex: string = data.solanaPayload;
      const adaUsdPrice: number = data.price;

      // synthToBurn en micro-USD (6 decimales)
      const synthMicro = BigInt(Math.round(synthFloat * 1_000_000));

      const txHash = await buildBurnTx(wallet as any, synthMicro, pythHex, adaUsdPrice, BLOCKFROST_KEY);

      setBurnResult({ ok: true, msg: `Tx enviada: ${txHash}` });
    } catch (e: any) {
      console.error("[handleBurn] error:", e);
      if (e?.info) console.error("[handleBurn] node error info:", JSON.stringify(e.info));
      if (e?.data) console.error("[handleBurn] error data:", JSON.stringify(e.data));
      setBurnResult({ ok: false, msg: e?.info ?? e.message ?? "Error desconocido" });
    } finally {
      setBurnLoading(false);
    }
  };

  const handleMint = async () => {
    const qty = parseFloat(adaInput);
    if (!qty || qty <= 0 || !cropInput.trim()) return;

    setMintLoading(true);
    setMintResult(null);

    try {
      // 1. Fetch current price + signed Pyth payload from backend
      const res = await fetch(`${API_URL}/api/get-adaprice`);
      const data = await res.json();
      const pythHex: string = data.solanaPayload;
      const adaUsdPrice: number = data.price;

      // 2. Farmer chose N tokens → compute required ADA lovelaces automatically
      const synthMicro = BigInt(Math.round(qty * 1_000_000));
      const lovelaces = computeLovelacesForSynth(synthMicro, adaUsdPrice);

      // 3. Crop name to hex (UTF-8) — farmer never sees hex
      const assetNameHex = Array.from(new TextEncoder().encode(cropInput.trim()))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const txHash = await buildMintTx(wallet as any, lovelaces, pythHex, adaUsdPrice, BLOCKFROST_KEY, assetNameHex);

      setMintResult({ ok: true, msg: `Tx enviada: ${txHash}` });
    } catch (e: any) {
      console.error("[handleMint] error:", e);
      // CIP-30 TxSendError has .info with the actual node rejection reason
      if (e?.info) console.error("[handleMint] node error info:", JSON.stringify(e.info));
      if (e?.data) console.error("[handleMint] error data:", JSON.stringify(e.data));
      setMintResult({ ok: false, msg: e?.info ?? e.message ?? "Error desconocido" });
    } finally {
      setMintLoading(false);
    }
  };

  useEffect(() => {
    const unsub = subscribe((newPrice) => {
      setPrice((prev) => {
        setPriceDir(newPrice >= prev ? "up" : "down");
        setTimeout(() => setPriceDir(null), 600);
        return newPrice;
      });
    });
    return unsub;
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#f5f5f7",
        fontFamily: ff,
        overflowX: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #0071e3, #30d158)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            ₳
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.3px",
              color: "#f5f5f7",
            }}
          >
            Cardano Pyth
          </span>
        </div>

        <Wallet />
      </nav>

      {/* Main */}
      <main
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "48px 24px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Hero precio */}
        <section style={{ textAlign: "center", marginBottom: 52 }}>
          <p
            style={{
              fontSize: 12,
              color: "#98989d",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            Live ADA Price
          </p>

          <h1
            style={{
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: "-4px",
              lineHeight: 1,
              color:
                priceDir === "up"
                  ? "#30d158"
                  : priceDir === "down"
                    ? "#ff453a"
                    : "#f5f5f7",
              marginBottom: 16,
              transition: "color 0.4s ease",
              fontFamily: ff,
              background: "none",
              WebkitTextFillColor: "unset",
            }}
          >
            ${price.toFixed(4)}
          </h1>

          {/* Indicador de dirección */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {priceDir && (
              <span
                style={{
                  fontSize: 18,
                  color: priceDir === "up" ? "#30d158" : "#ff453a",
                  transition: "opacity 0.3s",
                }}
              >
                {priceDir === "up" ? "▲" : "▼"}
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(48,209,88,0.12)",
                border: "1px solid rgba(48,209,88,0.25)",
                borderRadius: 980,
                padding: "5px 14px",
                fontSize: 13,
                color: "#30d158",
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#30d158",
                  display: "inline-block",
                  boxShadow: "0 0 6px #30d158",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              Live · Pyth Network
            </span>
          </div>
        </section>

        {/* Mint button — visible only when wallet is connected */}
        {connected && (
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 40 }}>
            <button
              onClick={() => { setMintOpen(true); setMintResult(null); setAdaInput(""); setCropInput(""); }}
              style={{
                background: "linear-gradient(135deg, #0071e3, #30d158)",
                border: "none",
                borderRadius: 980,
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                padding: "14px 48px",
                cursor: "pointer",
                fontFamily: ff,
                letterSpacing: "-0.2px",
                boxShadow: "0 4px 24px rgba(0,113,227,0.35)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow = "0 6px 32px rgba(0,113,227,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,113,227,0.35)";
              }}
            >
              Mint
            </button>
            <button
              onClick={() => { setBurnOpen(true); setBurnResult(null); setSynthInput(""); }}
              style={{
                background: "rgba(255,69,58,0.15)",
                border: "1px solid rgba(255,69,58,0.35)",
                borderRadius: 980,
                color: "#ff453a",
                fontSize: 16,
                fontWeight: 600,
                padding: "14px 48px",
                cursor: "pointer",
                fontFamily: ff,
                letterSpacing: "-0.2px",
                boxShadow: "0 4px 24px rgba(255,69,58,0.15)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow = "0 6px 32px rgba(255,69,58,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(255,69,58,0.15)";
              }}
            >
              Burn
            </button>
            <button
              onClick={() => { setLiquidateOpen(true); setLiquidateResult(null); setLiquidateSynthInput(""); }}
              style={{
                background: "rgba(255,159,10,0.15)",
                border: "1px solid rgba(255,159,10,0.35)",
                borderRadius: 980,
                color: "#ff9f0a",
                fontSize: 16,
                fontWeight: 600,
                padding: "14px 48px",
                cursor: "pointer",
                fontFamily: ff,
                letterSpacing: "-0.2px",
                boxShadow: "0 4px 24px rgba(255,159,10,0.15)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow = "0 6px 32px rgba(255,159,10,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(255,159,10,0.15)";
              }}
            >
              Liquidate
            </button>
          </div>
        )}

        {/* Chart card */}
        <section
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20,
            padding: "24px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#f5f5f7",
                  letterSpacing: "-0.2px",
                }}
              >
                Price History
              </h2>
              <p style={{ fontSize: 12, color: "#98989d", marginTop: 3 }}>
                ADA / USD · Live
              </p>
            </div>

            <div
              style={{
                background: "rgba(0,113,227,0.12)",
                border: "1px solid rgba(0,113,227,0.25)",
                borderRadius: 980,
                padding: "4px 12px",
                fontSize: 12,
                color: "#0071e3",
                fontWeight: 500,
              }}
            >
              Lightweight Charts
            </div>
          </div>

          <Chart />
        </section>

        {/* Open Positions */}
        <section>
          <p
            style={{
              fontSize: 11,
              color: "#98989d",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Open Positions
          </p>

          <NFTCard entryPrice={0.26} currentPrice={price} amount={100} />
        </section>
      </main>

      {/* Mint Modal */}
      {mintOpen && (
        <div
          onClick={() => !mintLoading && setMintOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(28,28,30,0.97)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 28, width: 360,
              boxShadow: "0 40px 100px rgba(0,0,0,0.8)", fontFamily: ff,
            }}
          >
            <h2 style={{ color: "#f5f5f7", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
              Mint Synth-USD
            </h2>
            <p style={{ color: "#98989d", fontSize: 13, marginBottom: 20 }}>
              ¿Qué cultivo y cuántos tokens querés emitir?
            </p>

            <input
              type="text"
              placeholder="Cultivo (ej: Arroz, Soja, Maíz)"
              value={cropInput}
              onChange={(e) => setCropInput(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, padding: "12px 16px",
                color: "#f5f5f7", fontSize: 16, fontFamily: ff,
                outline: "none", marginBottom: 12,
              }}
            />

            <input
              type="number"
              min="1"
              placeholder="Cantidad de tokens (ej: 100)"
              value={adaInput}
              onChange={(e) => setAdaInput(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, padding: "12px 16px",
                color: "#f5f5f7", fontSize: 16, fontFamily: ff,
                outline: "none", marginBottom: 8,
              }}
            />
            <p style={{ color: "#98989d", fontSize: 12, marginBottom: 20 }}>
              {adaInput && parseFloat(adaInput) > 0
                ? <>Necesitás depositar <span style={{ color: "#f5f5f7", fontWeight: 600 }}>
                    {(parseFloat(adaInput) * 150 / 100 / price).toFixed(2)} ADA
                  </span> · Precio actual: ${price.toFixed(4)}</>
                : <>Precio actual: ${price.toFixed(4)}</>
              }
            </p>

            {mintResult && (
              <p style={{
                color: mintResult.ok ? "#30d158" : "#ff453a",
                fontSize: 13, marginBottom: 16,
                wordBreak: "break-all",
              }}>
                {mintResult.msg}
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setMintOpen(false)}
                disabled={mintLoading}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#98989d", fontSize: 15, cursor: "pointer", fontFamily: ff,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleMint}
                disabled={mintLoading || !adaInput || !cropInput.trim()}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: mintLoading ? "rgba(0,113,227,0.5)" : "linear-gradient(135deg, #0071e3, #30d158)",
                  border: "none", color: "#fff", fontSize: 15,
                  fontWeight: 600, cursor: mintLoading ? "not-allowed" : "pointer", fontFamily: ff,
                }}
              >
                {mintLoading ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Burn Modal */}
      {burnOpen && (
        <div
          onClick={() => !burnLoading && setBurnOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(28,28,30,0.97)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 28, width: 360,
              boxShadow: "0 40px 100px rgba(0,0,0,0.8)", fontFamily: ff,
            }}
          >
            <h2 style={{ color: "#f5f5f7", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
              Burn Synth-USD
            </h2>
            <p style={{ color: "#98989d", fontSize: 13, marginBottom: 20 }}>
              Ingresa cuánto synth-USD deseas quemar
            </p>

            <input
              type="number"
              min="0"
              placeholder="Ej: 5.00"
              value={synthInput}
              onChange={(e) => setSynthInput(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, padding: "12px 16px",
                color: "#f5f5f7", fontSize: 16, fontFamily: ff,
                outline: "none", marginBottom: 8,
              }}
            />
            <p style={{ color: "#98989d", fontSize: 12, marginBottom: 20 }}>
              Precio actual: ${price.toFixed(4)} · Recibirás ≈ {synthInput ? (parseFloat(synthInput) / price).toFixed(4) : "0"} ADA
            </p>

            {burnResult && (
              <p style={{
                color: burnResult.ok ? "#30d158" : "#ff453a",
                fontSize: 13, marginBottom: 16,
                wordBreak: "break-all",
              }}>
                {burnResult.msg}
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setBurnOpen(false)}
                disabled={burnLoading}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#98989d", fontSize: 15, cursor: "pointer", fontFamily: ff,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleBurn}
                disabled={burnLoading || !synthInput}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: burnLoading ? "rgba(255,69,58,0.3)" : "rgba(255,69,58,0.85)",
                  border: "none", color: "#fff", fontSize: 15,
                  fontWeight: 600, cursor: burnLoading ? "not-allowed" : "pointer", fontFamily: ff,
                }}
              >
                {burnLoading ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liquidate Modal */}
      {liquidateOpen && (
        <div
          onClick={() => !liquidateLoading && setLiquidateOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(28,28,30,0.97)",
              border: "1px solid rgba(255,159,10,0.2)",
              borderRadius: 20, padding: 28, width: 360,
              boxShadow: "0 40px 100px rgba(0,0,0,0.8)", fontFamily: ff,
            }}
          >
            <h2 style={{ color: "#ff9f0a", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
              Liquidate Position
            </h2>
            <p style={{ color: "#98989d", fontSize: 13, marginBottom: 20 }}>
              Quema synth de una posición undercollateralizada. Cualquiera puede liquidar.
            </p>

            <input
              type="number"
              min="0"
              placeholder="Ej: 5.00"
              value={liquidateSynthInput}
              onChange={(e) => setLiquidateSynthInput(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,159,10,0.25)",
                borderRadius: 12, padding: "12px 16px",
                color: "#f5f5f7", fontSize: 16, fontFamily: ff,
                outline: "none", marginBottom: 8,
              }}
            />
            <p style={{ color: "#98989d", fontSize: 12, marginBottom: 20 }}>
              Precio actual: ${price.toFixed(4)} · Recibirás ≈ {liquidateSynthInput ? (parseFloat(liquidateSynthInput) / price).toFixed(4) : "0"} ADA
            </p>

            {liquidateResult && (
              <p style={{
                color: liquidateResult.ok ? "#30d158" : "#ff453a",
                fontSize: 13, marginBottom: 16,
                wordBreak: "break-all",
              }}>
                {liquidateResult.msg}
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setLiquidateOpen(false)}
                disabled={liquidateLoading}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#98989d", fontSize: 15, cursor: "pointer", fontFamily: ff,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleLiquidate}
                disabled={liquidateLoading || !liquidateSynthInput}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: liquidateLoading ? "rgba(255,159,10,0.3)" : "rgba(255,159,10,0.85)",
                  border: "none", color: "#fff", fontSize: 15,
                  fontWeight: 600, cursor: liquidateLoading ? "not-allowed" : "pointer", fontFamily: ff,
                }}
              >
                {liquidateLoading ? "Procesando..." : "Liquidar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
