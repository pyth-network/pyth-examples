"use client";

import { useMemo, useState, type CSSProperties } from "react";

type DemoPresetName = "base" | "insufficientCollateral" | "staleOracle";
type Commodity = "WHEAT" | "SOY" | "CORN";
type Unit = "TON" | "KG";

type DemoRequest = {
  agreement: {
    agreementId: string;
    commodity: Commodity;
    buyerAddress: string;
    sellerAddress: string;
    quantity: number;
    unit: Unit;
    referencePriceFeedId: number;
    strikePriceUsd: number;
    floorPriceUsd: number;
    capPriceUsd: number;
    expiresAt: string;
    collateralAda: string;
  };
  demoOraclePriceUsd?: number;
  demoOracleAsOf?: string;
  demoAdaUsdFx: number;
  maxOracleAgeSeconds: number;
  allowDemoFallback: boolean;
};

type ApiState = { status: "idle" | "loading" | "success" | "error"; payload: string };

const presets: Record<DemoPresetName, DemoRequest> = {
  base: {
    agreement: {
      agreementId: "agr-wheat-001",
      commodity: "WHEAT",
      buyerAddress: "addr_test1qpbuyer000000000000000000000000000000000000",
      sellerAddress: "addr_test1qpseller00000000000000000000000000000000000",
      quantity: 100,
      unit: "TON",
      referencePriceFeedId: 16,
      strikePriceUsd: 240,
      floorPriceUsd: 220,
      capPriceUsd: 280,
      expiresAt: "2026-04-30T00:00:00.000Z",
      collateralAda: "50000000"
    },
    demoOraclePriceUsd: 255,
    demoOracleAsOf: new Date().toISOString(),
    demoAdaUsdFx: 1,
    maxOracleAgeSeconds: 900,
    allowDemoFallback: false
  },
  insufficientCollateral: {
    agreement: {
      agreementId: "agr-soy-002",
      commodity: "SOY",
      buyerAddress: "addr_test1qpbuyer000000000000000000000000000000000000",
      sellerAddress: "addr_test1qpseller00000000000000000000000000000000000",
      quantity: 500,
      unit: "TON",
      referencePriceFeedId: 16,
      strikePriceUsd: 240,
      floorPriceUsd: 220,
      capPriceUsd: 320,
      expiresAt: "2026-05-10T00:00:00.000Z",
      collateralAda: "5000000"
    },
    demoOraclePriceUsd: 315,
    demoOracleAsOf: new Date().toISOString(),
    demoAdaUsdFx: 1,
    maxOracleAgeSeconds: 900,
    allowDemoFallback: false
  },
  staleOracle: {
    agreement: {
      agreementId: "agr-corn-003",
      commodity: "CORN",
      buyerAddress: "addr_test1qpbuyer000000000000000000000000000000000000",
      sellerAddress: "addr_test1qpseller00000000000000000000000000000000000",
      quantity: 150,
      unit: "TON",
      referencePriceFeedId: 16,
      strikePriceUsd: 215,
      floorPriceUsd: 200,
      capPriceUsd: 260,
      expiresAt: "2026-05-20T00:00:00.000Z",
      collateralAda: "45000000"
    },
    demoOraclePriceUsd: 248,
    demoOracleAsOf: "2026-01-01T00:00:00.000Z",
    demoAdaUsdFx: 1,
    maxOracleAgeSeconds: 900,
    allowDemoFallback: false
  }
};
const apiBaseUrl = process.env.NEXT_PUBLIC_COMMODITIES_API_URL ?? "http://localhost:4020";

export default function Page() {
  const [requestBody, setRequestBody] = useState(JSON.stringify(presets.base, null, 2));
  const [quoteState, setQuoteState] = useState<ApiState>({ status: "idle", payload: "" });
  const [prepareState, setPrepareState] = useState<ApiState>({ status: "idle", payload: "" });
  const parsedRequest = useMemo<DemoRequest | null>(() => {
    try { return JSON.parse(requestBody) as DemoRequest; } catch { return null; }
  }, [requestBody]);
  const summary = useMemo(() => {
    if (!parsedRequest) return null;
    const range = parsedRequest.agreement.capPriceUsd - parsedRequest.agreement.floorPriceUsd;
    const upperExposure = Math.abs(parsedRequest.agreement.capPriceUsd - parsedRequest.agreement.strikePriceUsd) * parsedRequest.agreement.quantity;
    const lowerExposure = Math.abs(parsedRequest.agreement.floorPriceUsd - parsedRequest.agreement.strikePriceUsd) * parsedRequest.agreement.quantity;
    const maxExposure = Math.max(upperExposure, lowerExposure);
    return {
      agreementId: parsedRequest.agreement.agreementId,
      commodity: parsedRequest.agreement.commodity,
      quantityLabel: `${parsedRequest.agreement.quantity} ${parsedRequest.agreement.unit}`,
      range,
      maxExposure,
      collateralAda: parsedRequest.agreement.collateralAda,
      oraclePriceUsd: parsedRequest.demoOraclePriceUsd ?? "missing",
      expiresAt: parsedRequest.agreement.expiresAt
    };
  }, [parsedRequest]);

  async function invoke(path: string, setter: (next: ApiState) => void) {
    setter({ status: "loading", payload: "" });
    try {
      const parsedBody = JSON.parse(requestBody);
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedBody)
      });
      const json = await response.json();
      setter({ status: response.ok ? "success" : "error", payload: JSON.stringify(json, null, 2) });
    } catch (error) {
      setter({
        status: "error",
        payload: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown error" }, null, 2)
      });
    }
  }

  function applyPreset(name: DemoPresetName) {
    setRequestBody(JSON.stringify(presets[name], null, 2));
    setQuoteState({ status: "idle", payload: "" });
    setPrepareState({ status: "idle", payload: "" });
  }

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", margin: "0 auto", maxWidth: 1380, padding: 32, color: "#111827" }}>
      <section style={{ display: "grid", gap: 16 }}>
        <span style={eyebrowStyle}>Cardano PreProd · bilateral infrastructure · cash-settled</span>
        <h1 style={{ fontSize: 38, margin: 0 }}>Tokenized Commodities</h1>
        <p style={{ color: "#4b5563", maxWidth: 1060, lineHeight: 1.6, margin: 0 }}>
          MVP para acuerdos bilaterales commodity-linked. No es exchange, no es oferta pública, no es delivery físico, no es tokenización mágica del commodity.
          Sí es una infraestructura privada con quote auditable, control de colateral, oracle con fallback y draft de settlement entendible en menos de un minuto.
        </p>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginTop: 24 }}>
        {[["Tesis", "Acuerdo bilateral programable"],["Pricing", "Pyth primary + demo fallback"],["Settlement", "Cash-settled con cap/floor"],["Riesgo", "Dispute si falta pricing confiable"]].map(([label, value]) => (
          <article key={label} style={summaryCardStyle}>
            <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
            <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700 }}>{value}</div>
          </article>
        ))}
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 20, marginTop: 24, alignItems: "start" }}>
        <article style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Scenario builder</h2>
              <p style={{ margin: "8px 0 0", color: "#6b7280" }}>Editá el payload o cargá un preset. Después pedí quote y settlement draft.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => applyPreset("base")} style={secondaryButtonStyle}>Base</button>
              <button onClick={() => applyPreset("insufficientCollateral")} style={secondaryButtonStyle}>Under-collateralized</button>
              <button onClick={() => applyPreset("staleOracle")} style={secondaryButtonStyle}>Stale oracle</button>
            </div>
          </div>
          <textarea value={requestBody} onChange={(event) => setRequestBody(event.target.value)} spellCheck={false} style={{ width: "100%", minHeight: 520, marginTop: 16, borderRadius: 18, border: "1px solid #d1d5db", padding: 16, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, lineHeight: 1.55, resize: "vertical", background: "#0f172a", color: "#e2e8f0" }} />
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={() => invoke("/agreements/quote", setQuoteState)} style={primaryButtonStyle}>1. Obtener quote</button>
            <button onClick={() => invoke("/agreements/prepare-settlement", setPrepareState)} style={primaryButtonStyle}>2. Preparar settlement</button>
            <span style={{ alignSelf: "center", color: parsedRequest ? "#166534" : "#b91c1c", fontSize: 13, fontWeight: 700 }}>{parsedRequest ? "JSON válido" : "JSON inválido"}</span>
          </div>
        </article>
        <section style={{ display: "grid", gap: 20 }}>
          <article style={panelStyle}>
            <h2 style={{ marginTop: 0, fontSize: 22 }}>Quick read</h2>
            {summary ? <div style={{ display: "grid", gap: 12 }}>
              <Metric label="Agreement" value={summary.agreementId} />
              <Metric label="Commodity" value={summary.commodity} />
              <Metric label="Quantity" value={summary.quantityLabel} />
              <Metric label="Price range" value={`USD ${summary.range}`} />
              <Metric label="Max bounded exposure" value={`USD ${summary.maxExposure}`} />
              <Metric label="Posted collateral" value={`${summary.collateralAda} lovelace`} />
              <Metric label="Demo oracle" value={String(summary.oraclePriceUsd)} />
              <Metric label="Expiry" value={summary.expiresAt} />
            </div> : <p style={{ color: "#b91c1c", margin: 0 }}>El JSON actual no se puede interpretar.</p>}
          </article>
          <article style={panelStyle}>
            <h2 style={{ marginTop: 0, fontSize: 22 }}>Execution path</h2>
            <ol style={{ margin: 0, paddingLeft: 18, color: "#374151", lineHeight: 1.7 }}>
              <li>Validar acuerdo y normalizar payload.</li>
              <li>Intentar signed payload de Pyth como prueba primaria.</li>
              <li>Usar precio numérico demo como secondary source para el settlement del hackathon.</li>
              <li>Calcular cap/floor, variation, collateral sufficiency.</li>
              <li>Emitir tx draft o dispute path con audit trail.</li>
            </ol>
          </article>
          <ResultCard title="Quote response" state={quoteState} />
          <ResultCard title="Prepare-settlement response" state={prepareState} />
        </section>
      </section>
    </main>
  );
}

function ResultCard({ title, state }: { title: string; state: ApiState }) {
  return (
    <article style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
        <StatusPill status={state.status} />
      </div>
      <pre style={{ marginTop: 16, background: "#020617", color: "#e2e8f0", borderRadius: 18, padding: 16, minHeight: 240, overflowX: "auto", fontSize: 12, lineHeight: 1.55 }}>{state.payload || "Todavía no ejecutaste este paso."}</pre>
    </article>
  );
}

function StatusPill({ status }: { status: ApiState["status"] }) {
  const label = { idle: "idle", loading: "loading", success: "success", error: "error" }[status];
  const background = { idle: "#e5e7eb", loading: "#dbeafe", success: "#dcfce7", error: "#fee2e2" }[status];
  return <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "6px 10px", background }}>{label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span><strong style={{ fontSize: 15 }}>{value}</strong></div>;
}

const eyebrowStyle: CSSProperties = { display: "inline-flex", width: "fit-content", borderRadius: 999, padding: "6px 12px", background: "#e2e8f0", color: "#0f172a", fontSize: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" };
const panelStyle: CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 24, padding: 20, background: "white", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)" };
const summaryCardStyle: CSSProperties = { ...panelStyle, padding: 16 };
const primaryButtonStyle: CSSProperties = { appearance: "none", border: "none", borderRadius: 999, padding: "12px 18px", fontWeight: 700, cursor: "pointer", background: "#111827", color: "white" };
const secondaryButtonStyle: CSSProperties = { appearance: "none", border: "1px solid #cbd5e1", borderRadius: 999, padding: "10px 14px", fontWeight: 700, cursor: "pointer", background: "white", color: "#111827" };
