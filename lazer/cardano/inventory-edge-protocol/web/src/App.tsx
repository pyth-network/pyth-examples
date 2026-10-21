import { useCallback, useEffect, useMemo, useState } from "react";

import {
  formatTAdaFromLovelace,
  VaultContentsCard,
  VaultMiniCard,
} from "./vault_display";

type Health = {
  ok: boolean;
  hasMnemonic: boolean;
  hasAccessToken: boolean;
  hasBlockfrostOrMaestro: boolean;
  evolutionChainBackend?: "blockfrost" | "maestro" | "koios";
};

type Config = {
  vaultAddressBech32: string;
  vaultScriptHash: string;
  liquidityPoolAddressBech32?: string;
  liquidityPoolScriptHash?: string;
  poolDepositReserveLovelace?: string;
  pythPolicyIdHex: string;
  feeds: Record<string, number>;
  demoSlots: Record<string, { title: string; subtitle: string }>;
  formulas: { liquidateWhen: string; claimInsuranceWhen: string };
};

type MintOut = {
  txHash: string;
  policyId: string;
  assetName: string;
  nameHex: string;
  slot: string;
  feedId: number;
};

type VaultRow = {
  ref: string;
  txHash: string;
  outputIndex: string;
  lovelace: string;
  datum: {
    ownerKeyHashHex?: string;
    debtLovelace: string;
    collateralQty: string;
    feedId: string;
    nftPolicyHex: string;
    nftNameHex: string;
    hedge: null | { strikeRaw: string; payoutLovelace: string };
  };
};

type Risk = {
  underwater: boolean;
  claimEligible: boolean;
  quote?: { priceRaw?: string; exponent?: number; humanApprox?: string };
  note?: string;
  debtLovelace: string;
  collateralQty: string;
  hedge: null | { strikeRaw: string; payoutLovelace: string };
  marketOpen?: boolean;
  marketLabel?: string;
  marketHint?: string;
  loanPoolNote?: string;
};

type ShadowNft = {
  policyId: string;
  nameHex: string;
  nameUtf8: string;
  unit: string;
  feedId: number;
  utxoLovelace: string;
};

/** Todos los nativos en Lucid (`/api/wallet` → nativeNfts). */
type NativeNft = {
  policyId: string;
  nameHex: string;
  nameUtf8?: string;
  quantity: string;
  unit: string;
  /** Si falta (API vieja), se usa quantity agregada === 1. */
  hasSingletonUtxo?: boolean;
  suggestedFeedId?: number;
};

type DemoFeedRow = {
  slot: string;
  key: string;
  label: string;
  uiTitle: string;
  proSymbol: string;
  lazerChannel: string;
  feedId: number;
  proSymbolUsed?: string;
  quoteNote?: string;
  marketOpen?: boolean;
  marketLabel?: string;
  quote: {
    priceFeedId?: number;
    priceRaw?: string;
    exponent?: number;
    humanApprox?: string;
    resolvedProSymbol?: string;
    quoteNote?: string;
  };
};

type AuditEvent = {
  ts: string;
  kind: string;
  summary: string;
  txHash?: string;
  extra?: Record<string, string | number | boolean | null>;
};

type MockPoolState = {
  /** Suma lovelace en UTxOs del script pool (tu owner). */
  poolScriptTotalLovelace?: string;
  availableLovelace: string;
  encumberedLovelace: string;
  deployedToLoansLovelace: string;
  totalDepositedLovelace: string;
  totalPaidOutLovelace: string;
  totalRepaidPrincipalLovelace: string;
  profitsFromLoansLovelace: string;
  profitsFromInsuranceLovelace: string;
  reservations: {
    nftPolicyHex: string;
    nftNameHex: string;
    payoutLovelace: string;
    vaultRef: string;
  }[];
  outstandingLoans: Record<string, string>;
};

type TabId = "general" | "creditos" | "seguros";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await r.text();
  const trimmed = text.trim();
  if (!trimmed) {
    const proxyHint =
      r.status === 502 || r.status === 503 || r.status === 504
        ? " ¿Corre la API en :8787 (`npm run dev:api` o `npm run demo`)?"
        : "";
    throw new Error(
      `Respuesta vacía del servidor (HTTP ${r.status}).${proxyHint}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed,
    );
  }
  if (!r.ok) {
    const errBody = parsed as {
      error?: string;
      code?: string;
      availableLovelace?: string;
      requestedLovelace?: string;
      effectiveAvailableLovelace?: string;
    };
    const bits = [
      errBody.error ?? r.statusText,
      errBody.code ? `[${errBody.code}]` : "",
      errBody.availableLovelace != null
        ? `disponible ${errBody.availableLovelace}`
        : "",
      errBody.requestedLovelace != null
        ? `pedido ${errBody.requestedLovelace}`
        : "",
      errBody.effectiveAvailableLovelace != null
        ? `efectivo cobertura ${errBody.effectiveAvailableLovelace}`
        : "",
    ].filter(Boolean);
    if (errBody.code === "API_UNAVAILABLE") {
      bits.push(
        "Tip: en `inventory-edge-protocol` ejecutá `npm run dev` (sube API :8787 y Vite juntos).",
      );
    }
    throw new Error(bits.join(" · "));
  }
  return parsed as T;
}

function shortTx(h?: string, n = 14): string {
  if (!h) return "—";
  return h.length <= n ? h : `${h.slice(0, n)}…`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeUnitKey(unit: string): string {
  return unit.replace(/\s/g, "").toLowerCase();
}

/** Unit agregada (policy + name hex), misma clave que `nativeNfts[].unit`. */
function normalizedNftUnit(policyId: string, nameHex: string): string {
  return normalizeUnitKey(policyId + nameHex);
}

type WalletApiPayload = {
  address: string;
  lucidAddress?: string;
  paymentKeyHashHex?: string;
  lovelace: string;
  adaApprox: string;
  nftCount: number;
  nativeNfts?: NativeNft[];
  shadowNfts: ShadowNft[];
  /** Si Lucid falló pero Evolution respondió (mint/listado pueden fallar aparte). */
  lucidError?: string;
};

type WalletState = {
  address: string;
  lucidAddress?: string;
  paymentKeyHashHex?: string;
  lovelace: string;
  adaApprox: string;
  nftCount: number;
  nativeNfts: NativeNft[];
  shadowNfts: ShadowNft[];
  lucidError?: string;
};

function mapApiToWalletState(w: WalletApiPayload): WalletState {
  return {
    address: w.address,
    lucidAddress: w.lucidAddress,
    paymentKeyHashHex: w.paymentKeyHashHex,
    lovelace: w.lovelace ?? "0",
    adaApprox: w.adaApprox,
    nftCount: w.nftCount,
    nativeNfts: w.nativeNfts ?? [],
    shadowNfts: w.shadowNfts ?? [],
    lucidError: w.lucidError,
  };
}

/** API actualiza filas; conserva filas que el indexador aún no devuelve (p. ej. recién minteadas). */
function mergeWalletFromApi(prev: WalletState, w: WalletApiPayload): WalletState {
  const fromApiNative = w.nativeNfts ?? [];
  const fromApiShadow = w.shadowNfts ?? [];
  const nativeMap = new Map<string, NativeNft>();
  for (const n of prev.nativeNfts) {
    nativeMap.set(normalizeUnitKey(n.unit), n);
  }
  for (const n of fromApiNative) {
    nativeMap.set(normalizeUnitKey(n.unit), n);
  }
  const shadowMap = new Map<string, ShadowNft>();
  for (const s of prev.shadowNfts) {
    shadowMap.set(normalizeUnitKey(s.unit), s);
  }
  for (const s of fromApiShadow) {
    shadowMap.set(normalizeUnitKey(s.unit), s);
  }
  const nativeNfts = sortNativeNftList([...nativeMap.values()]);
  const shadowNfts = [...shadowMap.values()].sort((a, b) =>
    a.nameUtf8.localeCompare(b.nameUtf8),
  );
  return {
    address: w.address,
    lucidAddress: w.lucidAddress,
    paymentKeyHashHex: w.paymentKeyHashHex ?? prev.paymentKeyHashHex,
    lovelace: w.lovelace ?? "0",
    adaApprox: w.adaApprox,
    nftCount: w.nftCount,
    nativeNfts,
    shadowNfts,
    lucidError: w.lucidError,
  };
}

function sortNativeNftList(nfts: NativeNft[]): NativeNft[] {
  return [...nfts].sort((a, b) => {
    if (a.hasSingletonUtxo !== b.hasSingletonUtxo) {
      return a.hasSingletonUtxo ? -1 : 1;
    }
    try {
      const qa = BigInt(a.quantity);
      const qb = BigInt(b.quantity);
      if (qa === 1n && qb !== 1n) return -1;
      if (qb === 1n && qa !== 1n) return 1;
    } catch {
      /* ignore */
    }
    return (a.nameUtf8 ?? a.unit).localeCompare(b.nameUtf8 ?? b.unit);
  });
}

function applyMintOptimisticToWallet(prev: WalletState, out: MintOut): WalletState {
  const policyId = out.policyId.replace(/\s/g, "").toLowerCase();
  const nameHex = out.nameHex.replace(/\s/g, "").toLowerCase();
  const unit = policyId + nameHex;
  const native: NativeNft = {
    policyId,
    nameHex,
    nameUtf8: out.assetName,
    quantity: "1",
    unit,
    hasSingletonUtxo: true,
    suggestedFeedId: out.feedId,
  };
  const shadow: ShadowNft = {
    policyId,
    nameHex,
    nameUtf8: out.assetName,
    unit,
    feedId: out.feedId,
    utxoLovelace: "0",
  };
  return {
    ...prev,
    lucidError: undefined,
    nativeNfts: [
      native,
      ...prev.nativeNfts.filter((n) => normalizeUnitKey(n.unit) !== unit),
    ],
    shadowNfts: [
      shadow,
      ...prev.shadowNfts.filter((s) => normalizeUnitKey(s.unit) !== unit),
    ],
  };
}

export default function App() {
  const [tab, setTab] = useState<TabId>("general");
  const [health, setHealth] = useState<Health | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [demoFeeds, setDemoFeeds] = useState<DemoFeedRow[] | null>(null);
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [risk, setRisk] = useState<Risk | null>(null);
  const [lastMint, setLastMint] = useState<MintOut | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [pool, setPool] = useState<MockPoolState | null>(null);

  const [nftPolicy, setNftPolicy] = useState("");
  const [nftNameHex, setNftNameHex] = useState("");
  const [feedId, setFeedId] = useState("346");
  const [debtLovelace, setDebtLovelace] = useState("0");
  const [collateralQty, setCollateralQty] = useState("1000000");
  const [openVaultCollateralHint, setOpenVaultCollateralHint] = useState<{
    minCollateralQty: string | null;
    suggestedCollateralQty: string | null;
    humanApprox?: string;
    priceRaw?: string;
    quoteNote?: string;
    formula?: string;
  } | null>(null);

  const [selRef, setSelRef] = useState<string | null>(null);
  const [strikeRaw, setStrikeRaw] = useState("2500000");
  const [payoutLovelace, setPayoutLovelace] = useState("5000000");
  const [newDebt, setNewDebt] = useState("0");
  const [onchainPoolLovelace, setOnchainPoolLovelace] = useState("10000000");

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const selectedVault = useMemo(
    () => vaults.find((v) => v.ref === selRef) ?? null,
    [vaults, selRef],
  );

  const demoFeedsLite = useMemo(
    () =>
      demoFeeds?.map((f) => ({
        feedId: f.feedId,
        uiTitle: f.uiTitle,
        slot: f.slot,
      })) ?? null,
    [demoFeeds],
  );

  const nativeSelectValue = useMemo(() => {
    if (!wallet?.nativeNfts.length) return "";
    const p = nftPolicy.replace(/\s/g, "").toLowerCase();
    const n = nftNameHex.replace(/\s/g, "").toLowerCase();
    const want = normalizedNftUnit(p, n);
    const hit = wallet.nativeNfts.find(
      (x) => normalizeUnitKey(x.unit) === want,
    );
    return hit?.unit ?? "";
  }, [wallet?.nativeNfts, nftPolicy, nftNameHex]);

  /**
   * NFTs que `openVault` puede gastar (al menos un UTxO con qty 1) y que no están
   * ya en una vault tuya (mismo owner en datum).
   */
  const vaultableNativeNfts = useMemo(() => {
    if (!wallet?.nativeNfts.length) return [];
    const me = wallet.paymentKeyHashHex?.replace(/\s/g, "").toLowerCase();
    const inVault = new Set<string>();
    if (me) {
      for (const v of vaults) {
        const ow = v.datum.ownerKeyHashHex?.replace(/\s/g, "").toLowerCase();
        if (!ow || ow !== me) continue;
        inVault.add(
          `${v.datum.nftPolicyHex.replace(/\s/g, "").toLowerCase()}|${v.datum.nftNameHex.replace(/\s/g, "").toLowerCase()}`,
        );
      }
    }
    return wallet.nativeNfts.filter((n) => {
      let canOpen: boolean;
      if (n.hasSingletonUtxo === true) canOpen = true;
      else if (n.hasSingletonUtxo === false) canOpen = false;
      else {
        try {
          canOpen = BigInt(n.quantity) === 1n;
        } catch {
          canOpen = false;
        }
      }
      if (!canOpen) return false;
      const k = `${n.policyId.toLowerCase()}|${n.nameHex.toLowerCase()}`;
      return !inVault.has(k);
    });
  }, [wallet?.nativeNfts, wallet?.paymentKeyHashHex, vaults]);

  /** Un solo NFT libre: rellenar campos al cargar / refrescar wallet o vaults. */
  useEffect(() => {
    if (vaultableNativeNfts.length !== 1) return;
    const only = vaultableNativeNfts[0]!;
    setNftPolicy(only.policyId);
    setNftNameHex(only.nameHex);
    if (only.suggestedFeedId != null) {
      setFeedId(String(only.suggestedFeedId));
    }
    setOpenVaultCollateralHint(null);
  }, [vaultableNativeNfts]);

  const refreshStatic = useCallback(async () => {
    const [h, c] = await Promise.all([
      api<Health>("/api/health"),
      api<Config>("/api/config"),
    ]);
    setHealth(h);
    setConfig(c);
  }, []);

  const refreshWallet = useCallback(async (): Promise<WalletApiPayload> => {
    const w = await api<WalletApiPayload>("/api/wallet");
    setWallet(mapApiToWalletState(w));
    return w;
  }, []);

  /**
   * Sincroniza con Blockfrost/Maestro sin borrar filas optimistas: merge con estado actual.
   * Corre en background (no bloquea el cartel de mint ni el dropdown).
   */
  const reconcileWalletAfterMint = useCallback((out: MintOut) => {
    const want = normalizedNftUnit(out.policyId, out.nameHex);
    void (async () => {
      for (let attempt = 0; attempt < 12; attempt++) {
        if (attempt > 0) await sleep(2000);
        try {
          const w = await api<WalletApiPayload>("/api/wallet");
          setWallet((prev) =>
            prev ? mergeWalletFromApi(prev, w) : mapApiToWalletState(w),
          );
          const native = w.nativeNfts ?? [];
          if (native.some((n) => normalizeUnitKey(n.unit) === want)) {
            return;
          }
        } catch {
          /* seguir */
        }
      }
    })();
  }, []);

  const refreshDemoFeeds = useCallback(async () => {
    const d = await api<{ rows: DemoFeedRow[] }>("/api/pyth/demo-feeds");
    setDemoFeeds(d.rows);
  }, []);

  const refreshVaults = useCallback(async () => {
    const v = await api<{ vaults: VaultRow[] }>("/api/vaults");
    setVaults(v.vaults);
    setSelRef((cur) => {
      if (cur && !v.vaults.some((x) => x.ref === cur)) {
        return v.vaults[0]?.ref ?? null;
      }
      return cur;
    });
  }, []);

  const refreshRisk = useCallback(async () => {
    if (!selRef) {
      setRisk(null);
      return;
    }
    const [txHash, outputIndex] = selRef.split("#");
    const r = await api<Risk>(
      `/api/risk?txHash=${encodeURIComponent(txHash)}&outputIndex=${encodeURIComponent(outputIndex)}`,
    );
    setRisk(r);
  }, [selRef]);

  const refreshAudit = useCallback(async () => {
    const j = await api<{ events: AuditEvent[] }>("/api/audit?limit=120");
    setAudit(j.events);
  }, []);

  const refreshPool = useCallback(async () => {
    const p = await api<MockPoolState>("/api/pool/state");
    setPool(p);
  }, []);

  useEffect(() => {
    refreshStatic().catch((e) =>
      setMsg({ type: "err", text: String(e.message) }),
    );
  }, [refreshStatic]);

  useEffect(() => {
    if (!health?.hasMnemonic) return;
    refreshWallet().catch((e) =>
      setMsg({
        type: "err",
        text: `No se pudo cargar la wallet (NFTs): ${e instanceof Error ? e.message : String(e)}`,
      }),
    );
    refreshVaults().catch(() => {});
  }, [health?.hasMnemonic, refreshWallet, refreshVaults]);

  useEffect(() => {
    if (!health?.hasAccessToken) return;
    refreshDemoFeeds().catch(() => setDemoFeeds(null));
  }, [health?.hasAccessToken, refreshDemoFeeds]);

  useEffect(() => {
    refreshAudit().catch(() => setAudit([]));
    refreshPool().catch(() => setPool(null));
  }, [health?.hasMnemonic, refreshAudit, refreshPool]);

  useEffect(() => {
    if (!selRef) {
      setRisk(null);
      return;
    }
    refreshRisk().catch(() => setRisk(null));
  }, [selRef, refreshRisk]);

  async function afterChainAction(): Promise<void> {
    await Promise.all([
      refreshVaults(),
      refreshWallet(),
      refreshAudit(),
      refreshPool(),
    ]);
  }

  async function run(
    label: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  const vaultSelect = (
    <div className="field">
      <label htmlFor="vaultsel">Elegí una caja fuerte (vault)</label>
      <p className="field-hint">
        Cada opción es una posición en el contrato: adentro está{" "}
        <strong>un NFT</strong> (tu colateral) y los números del préstamo / seguro.
      </p>
      <select
        id="vaultsel"
        value={selRef ?? ""}
        onChange={(e) => setSelRef(e.target.value || null)}
      >
        <option value="">— Ninguna seleccionada —</option>
        {vaults.map((v) => {
          const pol = v.datum.nftPolicyHex.replace(/\s/g, "").toLowerCase();
          const nm = v.datum.nftNameHex.replace(/\s/g, "").toLowerCase();
          const hit =
            wallet?.nativeNfts.find(
              (s) =>
                s.policyId.toLowerCase() === pol &&
                s.nameHex.toLowerCase() === nm,
            ) ??
            wallet?.shadowNfts.find(
              (s) =>
                s.policyId.toLowerCase() === pol &&
                s.nameHex.toLowerCase() === nm,
            );
          const short = hit?.nameUtf8 ?? `NFT · feed ${v.datum.feedId}`;
          return (
            <option key={v.ref} value={v.ref}>
              {short} · {formatTAdaFromLovelace(v.datum.debtLovelace)} tADA principal
              {v.datum.hedge ? " · con cobertura" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="nav-rail" aria-label="Navegación principal">
        <p className="nav-rail__title">Recorrido</p>
        {(
          [
            [
              "general",
              "Resumen",
              "Precios, pool, movimientos y qué hay en cada vault.",
            ],
            [
              "creditos",
              "Préstamo",
              "Crear activo, abrir caja, devolver o liquidar.",
            ],
            [
              "seguros",
              "Cobertura",
              "Depositar tADA al pool on-chain, activar seguro y cobrar si aplica.",
            ],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "tab active" : "tab"}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            <span className="tab__label">{label}</span>
            <span className="tab__hint">{hint}</span>
          </button>
        ))}
      </aside>

      <div className="main-content">
      <header className="page-intro">
        <h1>Inventory-Edge Protocol</h1>
        <p>
          Demo para entender el flujo sin ser experto en crypto:{" "}
          <strong>pool on-chain</strong> (script <code className="mono">liquidity_pool</code>
          ), <strong>cajas fuertes</strong>{" "}
          (contrato que guarda tu NFT y los números del préstamo), y{" "}
          <strong>precios Pyth</strong> para riesgo y liquidación. Los datos
          técnicos siguen disponibles en cada sección.
        </p>
      </header>

      {(busy || msg) && (
        <div
          className="card"
          style={{
            marginBottom: "1rem",
            padding: "0.65rem 1rem",
            borderStyle: "solid",
            borderWidth: 1,
            borderColor:
              msg?.type === "err"
                ? "var(--err-border, #c44)"
                : "var(--accent-muted, rgba(100,180,255,0.35))",
          }}
          role="status"
          aria-live="polite"
        >
          {busy && (
            <p style={{ margin: "0 0 0.35rem", color: "var(--accent)" }}>
              Ejecutando: <strong>{busy}</strong>…
            </p>
          )}
          {msg?.type === "err" && (
            <p className="err" style={{ margin: 0 }}>
              {msg.text}
            </p>
          )}
          {msg?.type === "ok" && (
            <p className="ok-msg" style={{ margin: 0 }}>
              {msg.text}
            </p>
          )}
        </div>
      )}

      {tab === "general" && (
        <>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Cotizaciones Pyth Pro</h2>
              <button
                type="button"
                disabled={!!busy || !health?.hasAccessToken}
                onClick={() => run("feeds", refreshDemoFeeds)}
              >
                Actualizar precios
              </button>
            </div>
            {!health?.hasAccessToken ? (
              <p>Falta ACCESS_TOKEN para ver precios.</p>
            ) : !demoFeeds ? (
              <p>Cargando feeds…</p>
            ) : (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {demoFeeds.map((row) => {
                  const open =
                    row.marketOpen === true || Boolean(row.quote?.priceRaw);
                  return (
                    <div
                      key={row.slot}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "0.65rem 0.75rem",
                        background: "#0e1218",
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                          {row.uiTitle}
                        </div>
                        <span
                          className={
                            open ? "badge ok" : "badge neutral"
                          }
                          title={
                            open
                              ? "Hay precio en el JSON de Pyth"
                              : "Sin precio ahora (mercado cerrado o sin publicadores)"
                          }
                        >
                          {open
                            ? "Mercado abierto"
                            : row.marketLabel ?? "Mercado cerrado"}
                        </span>
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: "0.7rem", opacity: 0.9 }}
                      >
                        {row.proSymbolUsed ?? row.proSymbol}
                        {row.proSymbolUsed &&
                          row.proSymbolUsed !== row.proSymbol && (
                            <span
                              style={{ color: "var(--warn)", marginLeft: "0.35rem" }}
                            >
                              (ref. alternativa)
                            </span>
                          )}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: "0.68rem", opacity: 0.75 }}
                      >
                        vault/mint id {row.feedId} · canal típ. {row.lazerChannel}
                        {row.quote?.priceFeedId != null && (
                          <> · cotización id {row.quote.priceFeedId}</>
                        )}
                      </div>
                      {(row.quoteNote ?? row.quote?.quoteNote) && (
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--warn)",
                            margin: "0.25rem 0 0",
                          }}
                        >
                          {row.quoteNote ?? row.quote?.quoteNote}
                        </p>
                      )}
                      {row.quote?.priceRaw ? (
                        <div style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>
                          <span className="mono">{row.quote.priceRaw}</span>
                          {row.quote.humanApprox && (
                            <span style={{ color: "var(--muted)" }}>
                              {" "}
                              ≈ {row.quote.humanApprox}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p
                          style={{
                            fontSize: "0.8rem",
                            margin: "0.35rem 0 0",
                            color: "var(--muted)",
                          }}
                        >
                          Sin precio en JSON en este momento — estado informativo,
                          no un fallo de la app.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-2" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <h2>Estado del entorno</h2>
              {!health ? (
                <p>Cargando…</p>
              ) : (
                <ul className="compact">
                  <li>
                    Mnemonic (.env):{" "}
                    {health.hasMnemonic ? (
                      <span className="badge ok">OK</span>
                    ) : (
                      <span className="badge bad">Falta</span>
                    )}
                  </li>
                  <li>
                    Pyth ACCESS_TOKEN:{" "}
                    {health.hasAccessToken ? (
                      <span className="badge ok">OK</span>
                    ) : (
                      <span className="badge bad">Falta</span>
                    )}
                  </li>
                  <li>
                    Blockfrost / Maestro (mint):{" "}
                    {health.hasBlockfrostOrMaestro ? (
                      <span className="badge ok">OK</span>
                    ) : (
                      <span className="badge bad">Falta</span>
                    )}
                  </li>
                  <li>
                    Vault txs — evaluación on-chain vía:{" "}
                    {health.evolutionChainBackend === "blockfrost" ? (
                      <span className="badge ok">Blockfrost</span>
                    ) : health.evolutionChainBackend === "maestro" ? (
                      <span className="badge ok">Maestro</span>
                    ) : (
                      <span className="badge warn" title="Koios público suele fallar en evaluateTx">
                        Koios (probar Blockfrost)
                      </span>
                    )}
                  </li>
                </ul>
              )}
              <p
                className="mono"
                style={{ marginTop: "0.75rem", fontSize: "0.72rem" }}
              >
                API local firma con <code>CARDANO_MNEMONIC</code> — solo demo.
              </p>
            </div>

            <div className="card">
              <h2>Wallet demo</h2>
              {!wallet ? (
                <p>—</p>
              ) : (
                <>
                  <p className="mono">{wallet.address}</p>
                  {wallet.lucidAddress &&
                    wallet.lucidAddress !== wallet.address && (
                      <p className="mono" style={{ fontSize: "0.75rem" }}>
                        Lucid (mint/openVault): {wallet.lucidAddress}
                      </p>
                    )}
                  <p>
                    <strong>{wallet.adaApprox}</strong> tADA · {wallet.nftCount}{" "}
                    líneas nativas (Evolution) ·{" "}
                    <strong>{wallet.nativeNfts.length}</strong> activos Lucid
                    (incl. shadow)
                  </p>
                  {wallet.lucidError && (
                    <p className="err" style={{ fontSize: "0.85rem" }}>
                      Lucid (mint / listado NFT): {wallet.lucidError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      run("refresh-all", async () => {
                        await refreshWallet();
                        await refreshVaults();
                        await refreshDemoFeeds();
                        await refreshAudit();
                        await refreshPool();
                      })
                    }
                    disabled={!!busy}
                  >
                    Refrescar todo
                  </button>
                </>
              )}
            </div>
          </div>

          {config && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h2>Contratos on-chain (PreProd)</h2>
              <p className="kicker" style={{ marginTop: 0 }}>
                Vault (NFT + préstamo)
              </p>
              <p className="mono">{config.vaultAddressBech32}</p>
              <p style={{ fontSize: "0.8rem" }}>
                Script hash:{" "}
                <span className="mono">{config.vaultScriptHash}</span>
              </p>
              {config.liquidityPoolAddressBech32 && (
                <>
                  <p className="kicker" style={{ marginTop: "0.85rem" }}>
                    Pool de liquidez (solo tADA, datum = tu clave)
                  </p>
                  <p className="mono">{config.liquidityPoolAddressBech32}</p>
                  <p style={{ fontSize: "0.8rem" }}>
                    Script hash:{" "}
                    <span className="mono">
                      {config.liquidityPoolScriptHash}
                    </span>
                  </p>
                  <p style={{ fontSize: "0.78rem" }}>
                    Reserva mínima en wallet al depositar:{" "}
                    <span className="mono">
                      {config.poolDepositReserveLovelace ?? "4000000"}
                    </span>{" "}
                    lovelace (fees). Config:{" "}
                    <code className="mono">POOL_DEPOSIT_RESERVE_LOVELACE</code>
                  </p>
                </>
              )}
            </div>
          )}

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>Qué custodia el contrato (vaults)</h2>
            <p className="field-hint" style={{ marginTop: 0 }}>
              Cada tarjeta es una posición donde el protocolo guarda{" "}
              <strong>un NFT</strong> (tu colateral) y los números del préstamo /
              seguro. Elegí una para ver el detalle y para usarla en Préstamo o
              Cobertura.
            </p>
            {vaults.length === 0 ? (
              <p>
                Aún no hay posiciones. En <strong>Préstamo</strong>, minteá un NFT
                sombra y abrí una caja.
              </p>
            ) : (
              <>
                <div className="vault-gallery">
                  {vaults.map((v) => (
                    <VaultMiniCard
                      key={v.ref}
                      vault={v}
                      shadowNfts={wallet?.shadowNfts ?? []}
                      nativeNfts={wallet?.nativeNfts ?? []}
                      demoFeeds={demoFeedsLite}
                      selected={selRef === v.ref}
                      onSelect={() => setSelRef(v.ref)}
                    />
                  ))}
                </div>
                {selectedVault && (
                  <VaultContentsCard
                    vault={selectedVault}
                    shadowNfts={wallet?.shadowNfts ?? []}
                    nativeNfts={wallet?.nativeNfts ?? []}
                    demoFeeds={demoFeedsLite}
                    heading="Detalle de la caja seleccionada"
                  />
                )}
              </>
            )}
          </div>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>Pool (solo blockchain)</h2>
            <p style={{ fontSize: "0.85rem" }}>
              Totales leídos en vivo: script{" "}
              <code className="mono">liquidity_pool</code> + datums de tus vaults
              (deuda y <code className="mono">hedge</code>). Las filas de
              “histórico / ganancias” no se persisten (siempre 0) — no valen txs
              extra solo para métricas.
            </p>
            {!pool ? (
              <p>—</p>
            ) : (
              <ul className="compact">
                {pool.poolScriptTotalLovelace != null && (
                  <li>
                    Total en script pool:{" "}
                    <span className="mono">{pool.poolScriptTotalLovelace}</span>{" "}
                    lovelace
                  </li>
                )}
                <li>
                  Disponible: <span className="mono">{pool.availableLovelace}</span>{" "}
                  lovelace
                </li>
                <li>
                  En préstamos (deployed):{" "}
                  <span className="mono">
                    {pool.deployedToLoansLovelace ?? "0"}
                  </span>
                </li>
                <li>
                  Apartado (coberturas):{" "}
                  <span className="mono">{pool.encumberedLovelace}</span>
                </li>
                <li>
                  Total depositado (hist.):{" "}
                  <span className="mono">{pool.totalDepositedLovelace}</span>
                </li>
                <li>
                  Principal amortizado (hist.):{" "}
                  <span className="mono">
                    {pool.totalRepaidPrincipalLovelace ?? "0"}
                  </span>
                </li>
                <li>
                  Ganancias préstamos (interés demo):{" "}
                  <span className="mono">
                    {pool.profitsFromLoansLovelace ?? "0"}
                  </span>
                </li>
                <li>
                  Ganancias seguros (fee demo):{" "}
                  <span className="mono">
                    {pool.profitsFromInsuranceLovelace ?? "0"}
                  </span>
                </li>
                <li>
                  Total “pagado” simulado (siniestros):{" "}
                  <span className="mono">{pool.totalPaidOutLovelace}</span>
                </li>
                <li>Reservas cobertura: {pool.reservations.length}</li>
                <li>
                  Préstamos tracked:{" "}
                  {pool.outstandingLoans
                    ? Object.keys(pool.outstandingLoans).length
                    : 0}
                </li>
              </ul>
            )}
            <button
              type="button"
              style={{ marginTop: "0.5rem" }}
              disabled={!!busy}
              onClick={() => run("pool-refresh", refreshPool)}
            >
              Refrescar pool
            </button>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>Movimientos (auditoría)</h2>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => run("audit", refreshAudit)}
              >
                Actualizar
              </button>
            </div>
            <p style={{ fontSize: "0.82rem" }}>
              Registro local en <code className="mono">data/judge_audit.json</code>{" "}
              para trazabilidad del jurado.
            </p>
            {audit.length === 0 ? (
              <p>Aún no hay eventos.</p>
            ) : (
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Resumen</th>
                      <th>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((e, i) => (
                      <tr key={`${e.ts}-${e.kind}-${i}`}>
                        <td className="mono">{e.ts.slice(0, 19)}</td>
                        <td>
                          <span className="mono">{e.kind}</span>
                        </td>
                        <td>{e.summary}</td>
                        <td className="mono">{shortTx(e.txHash, 12)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "creditos" && (
        <>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>Crédito y colateral</h2>
            <p style={{ fontSize: "0.88rem" }}>
              El <strong>vault</strong> custodia el NFT colateral. El{" "}
              <strong>principal</strong> del préstamo sale del{" "}
              <strong>pool on-chain</strong> (no se “imprime” deuda). Si el colateral
              no cubre principal + margen on-chain (~110%), podés{" "}
              <strong>liquidar</strong> (venta simulada → ingreso al pool). El
              <strong> interés demo</strong> se acredita al pool al bajar el
              principal con Adjust. Cobertura paramétrica: pestaña{" "}
              <strong>Seguros</strong>.
            </p>
          </div>

          <div className="grid grid-2" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <h2>Acuñar NFT sombra</h2>
              <p>
                NFT único por feed (oro / WTI / BTC proxy). Sirve de colateral
                en la vault. Requiere Blockfrost o Maestro en <code>.env</code>.
                Tras acuñar, el listado se actualiza al instante; el indexador
                puede tardar unos segundos en coincidir con la cadena.
              </p>
              <div className="row" style={{ marginTop: "0.75rem" }}>
                {(["metal", "oil", "stock"] as const).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className="primary"
                    disabled={!!busy || !health?.hasBlockfrostOrMaestro}
                    onClick={() =>
                      run(`mint-${slot}`, async () => {
                        const out = await api<MintOut>("/api/mint", {
                          method: "POST",
                          body: JSON.stringify({ slot }),
                        });
                        let wApi: WalletApiPayload;
                        try {
                          wApi = await api<WalletApiPayload>("/api/wallet");
                        } catch (e) {
                          setWallet((prev) =>
                            prev
                              ? applyMintOptimisticToWallet(prev, out)
                              : prev,
                          );
                          setLastMint(out);
                          setNftPolicy(out.policyId);
                          setNftNameHex(out.nameHex);
                          setFeedId(String(out.feedId));
                          setMsg({
                            type: "ok",
                            text: `Mint OK en cadena · ${out.assetName} · ${shortTx(out.txHash, 18)}. No se pudo leer /api/wallet: ${e instanceof Error ? e.message : String(e)}. Probá «Refrescar todo» en Resumen.`,
                          });
                          await Promise.all([
                            refreshVaults(),
                            refreshAudit(),
                            refreshPool(),
                          ]);
                          reconcileWalletAfterMint(out);
                          return;
                        }
                        setWallet((prev) => {
                          const base = prev
                            ? mergeWalletFromApi(prev, wApi)
                            : mapApiToWalletState(wApi);
                          return applyMintOptimisticToWallet(base, out);
                        });
                        setLastMint(out);
                        setNftPolicy(out.policyId);
                        setNftNameHex(out.nameHex);
                        setFeedId(String(out.feedId));
                        setMsg({
                          type: "ok",
                          text: `Mint OK · ${out.assetName} · tx ${shortTx(out.txHash, 20)}. Elegí el colateral en «NFT disponible para bloquear» (cada shadow es una línea distinta; podés tener varios del mismo feed).`,
                        });
                        await Promise.all([
                          refreshVaults(),
                          refreshAudit(),
                          refreshPool(),
                        ]);
                        reconcileWalletAfterMint(out);
                      })
                    }
                  >
                    {slot === "metal"
                      ? "Oro XAU/USD"
                      : slot === "oil"
                        ? "WTI futuro"
                        : "Bitcoin BTC/USD"}
                  </button>
                ))}
              </div>
              {lastMint && (
                <div
                  className="ok-msg"
                  style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}
                >
                  <strong>Último mint:</strong>{" "}
                  <span className="mono">{lastMint.assetName}</span> · feed{" "}
                  {lastMint.feedId} ·{" "}
                  <span className="mono">{shortTx(lastMint.txHash, 22)}</span>
                </div>
              )}
            </div>

            <div className="card">
              <h2>Abrir vault</h2>
              <p>
                Elegí un NFT de la wallet (vista <strong>Lucid</strong>
                ): cada sombra que minteaste es un <strong>activo distinto</strong>{" "}
                (nombre único), así que dos WTI aparecen como{" "}
                <strong>dos opciones</strong> en el menú. Hace falta al menos un
                UTxO con exactamente 1 unidad de ese token y que no esté ya en
                una vault tuya. Si el principal &gt; 0, el pool on-chain necesita
                tADA (Seguros).
              </p>
              {health?.hasMnemonic && wallet === null && (
                <p className="field-hint">Cargando NFTs (Lucid)…</p>
              )}
              {wallet && vaultableNativeNfts.length > 0 && (
                <div className="field">
                  <label htmlFor="nftsel">
                    NFT para bloquear en la vault (
                    {vaultableNativeNfts.length}{" "}
                    {vaultableNativeNfts.length === 1 ? "listo" : "listos"})
                  </label>
                  <select
                    id="nftsel"
                    value={
                      nativeSelectValue ||
                      (vaultableNativeNfts.length === 1
                        ? vaultableNativeNfts[0]!.unit
                        : "")
                    }
                    onChange={(e) => {
                      const u = e.target.value;
                      if (!u) {
                        setNftPolicy("");
                        setNftNameHex("");
                        setOpenVaultCollateralHint(null);
                        return;
                      }
                      const nft = wallet.nativeNfts.find(
                        (x) => normalizeUnitKey(x.unit) === normalizeUnitKey(u),
                      );
                      if (!nft) return;
                      setNftPolicy(nft.policyId);
                      setNftNameHex(nft.nameHex);
                      if (nft.suggestedFeedId != null) {
                        setFeedId(String(nft.suggestedFeedId));
                      }
                      setOpenVaultCollateralHint(null);
                    }}
                  >
                    {vaultableNativeNfts.length > 1 && (
                      <option value="">— Elegí un NFT —</option>
                    )}
                    {vaultableNativeNfts.map((n) => (
                      <option key={n.unit} value={n.unit}>
                        {n.nameUtf8 ??
                          `${n.policyId.slice(0, 8)}…${n.nameHex.slice(0, 6)}…`}{" "}
                        {n.suggestedFeedId != null
                          ? `· feed ${n.suggestedFeedId}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <p className="field-hint" style={{ marginTop: "0.35rem" }}>
                    Hace falta <strong>un UTxO con exactamente 1</strong> de ese
                    activo (si el total agregado es &gt;1 en varios UTxOs, igual
                    aparece). Solo se excluyen NFTs ya bloqueados en{" "}
                    <strong>tus</strong> vaults (mismo owner en datum).
                  </p>
                </div>
              )}
              {wallet && wallet.nativeNfts.length > 0 && (
                <details
                  className="field"
                  style={{ marginTop: "0.5rem", fontSize: "0.82rem" }}
                >
                  <summary style={{ cursor: "pointer" }}>
                    Ver los {wallet.nativeNfts.length} nativos Lucid (referencia)
                  </summary>
                  <ul className="compact" style={{ marginTop: "0.35rem" }}>
                    {wallet.nativeNfts.map((n) => (
                      <li key={n.unit} className="mono">
                        {n.nameUtf8 ?? `${n.policyId.slice(0, 10)}…`} · qty{" "}
                        {n.quantity} · singleton UTxO:{" "}
                        {n.hasSingletonUtxo === true
                          ? "sí"
                          : n.hasSingletonUtxo === false
                            ? "no"
                            : "?"}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {wallet &&
                wallet.nativeNfts.length > 0 &&
                vaultableNativeNfts.length === 0 && (
                  <p className="field-hint">
                    No hay NFTs listos para abrir vault: ya están en una vault
                    tuya, o ningún UTxo tiene exactamente 1 unidad de ese
                    token. Consolidá en un solo UTxO, cerrá una vault, minteá
                    otro shadow o usá edición manual.
                  </p>
                )}
              {wallet && wallet.nativeNfts.length === 0 && (
                <p className="field-hint">
                  No hay activos nativos en la wallet Lucid. Acuñá un shadow o
                  pulsá &quot;Refrescar wallet&quot; en Resumen.
                </p>
              )}
              <details
                className="field"
                style={{ marginTop: "0.65rem", marginBottom: "0.25rem" }}
              >
                <summary style={{ cursor: "pointer", fontSize: "0.9rem" }}>
                  Edición manual (policy / name hex)
                </summary>
                <div className="field" style={{ marginTop: "0.5rem" }}>
                  <label htmlFor="pol">NFT policy (hex)</label>
                  <input
                    id="pol"
                    value={nftPolicy}
                    onChange={(e) => setNftPolicy(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="nh">NFT name (hex)</label>
                  <input
                    id="nh"
                    value={nftNameHex}
                    onChange={(e) => setNftNameHex(e.target.value)}
                  />
                </div>
              </details>
              <div className="field">
                <label htmlFor="fid">Pyth feed id</label>
                <input
                  id="fid"
                  value={feedId}
                  onChange={(e) => {
                    setFeedId(e.target.value);
                    setOpenVaultCollateralHint(null);
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="debt">
                  Principal préstamo (lovelace, datum — consume pool)
                </label>
                <input
                  id="debt"
                  value={debtLovelace}
                  onChange={(e) => {
                    setDebtLovelace(e.target.value);
                    setOpenVaultCollateralHint(null);
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="qty">Cantidad colateral (entero, datum)</label>
                <input
                  id="qty"
                  value={collateralQty}
                  onChange={(e) => {
                    setCollateralQty(e.target.value);
                    setOpenVaultCollateralHint(null);
                  }}
                />
                <div className="row" style={{ marginTop: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <button
                    type="button"
                    disabled={
                      !!busy ||
                      !health?.hasAccessToken ||
                      !feedId.trim() ||
                      Number.isNaN(Number(feedId))
                    }
                    title="Usa precio Pyth actual y la regla on-chain price×qty×100 vs principal×110"
                    onClick={() =>
                      run("pyth-coll-hint", async () => {
                        const j = await api<{
                          minCollateralQty: string | null;
                          suggestedCollateralQty: string | null;
                          quote?: {
                            priceRaw?: string;
                            humanApprox?: string;
                            quoteNote?: string;
                          };
                          formula?: string;
                          note?: string;
                        }>(
                          `/api/pyth/collateral-hint?feedId=${encodeURIComponent(feedId.trim())}&debtLovelace=${encodeURIComponent(debtLovelace.trim() || "0")}`,
                        );
                        if (j.suggestedCollateralQty != null) {
                          setCollateralQty(j.suggestedCollateralQty);
                        }
                        setOpenVaultCollateralHint({
                          minCollateralQty: j.minCollateralQty,
                          suggestedCollateralQty: j.suggestedCollateralQty,
                          humanApprox: j.quote?.humanApprox,
                          priceRaw: j.quote?.priceRaw,
                          quoteNote: j.quote?.quoteNote ?? j.note,
                          formula: j.formula,
                        });
                        setMsg({
                          type: "ok",
                          text:
                            j.suggestedCollateralQty != null
                              ? `Colateral sugerido aplicado: ${j.suggestedCollateralQty} (Pyth humano ≈ ${j.quote?.humanApprox ?? "—"})`
                              : j.note ??
                                "Sin precio Pyth — no se pudo calcular colateral.",
                        });
                      })
                    }
                  >
                    Calcular colateral con Pyth (actual)
                  </button>
                </div>
                {openVaultCollateralHint && (
                  <p className="field-hint" style={{ marginTop: "0.5rem" }}>
                    Precio raw:{" "}
                    <span className="mono">{openVaultCollateralHint.priceRaw ?? "—"}</span>
                    {openVaultCollateralHint.humanApprox != null && (
                      <>
                        {" "}
                        · humano ≈ {openVaultCollateralHint.humanApprox}
                      </>
                    )}
                    <br />
                    Mínimo (sin buffer):{" "}
                    <span className="mono">
                      {openVaultCollateralHint.minCollateralQty ?? "—"}
                    </span>
                    {openVaultCollateralHint.quoteNote != null &&
                      openVaultCollateralHint.quoteNote !== "" && (
                        <>
                          <br />
                          {openVaultCollateralHint.quoteNote}
                        </>
                      )}
                    {openVaultCollateralHint.formula != null && (
                      <>
                        <br />
                        <span style={{ fontSize: "0.82em" }}>
                          {openVaultCollateralHint.formula}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="primary"
                disabled={
                  !!busy ||
                  !health?.hasMnemonic ||
                  !nftPolicy.trim() ||
                  !nftNameHex.trim() ||
                  !feedId.trim() ||
                  Number.isNaN(Number(feedId))
                }
                onClick={() =>
                  run("open", async () => {
                    const { txHash } = await api<{ txHash: string }>(
                      "/api/vault/open",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          nftPolicyHex: nftPolicy.trim(),
                          nftNameHex: nftNameHex.trim(),
                          feedId: Number(feedId),
                          debtLovelace,
                          collateralQty,
                        }),
                      },
                    );
                    setMsg({ type: "ok", text: `openVault tx ${txHash}` });
                    await afterChainAction();
                  })
                }
              >
                Abrir vault
              </button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>Tu caja fuerte activa</h2>
            {vaults.length === 0 ? (
              <p>Primero abrí una caja desde el bloque de arriba.</p>
            ) : (
              <>
                {vaultSelect}
                {selectedVault ? (
                  <VaultContentsCard
                    vault={selectedVault}
                    shadowNfts={wallet?.shadowNfts ?? []}
                    nativeNfts={wallet?.nativeNfts ?? []}
                    demoFeeds={demoFeedsLite}
                    heading="Contenido y números"
                    intro={
                      <p className="field-hint" style={{ marginTop: 0 }}>
                        Las acciones de abajo aplican a esta posición.
                      </p>
                    }
                  />
                ) : (
                  <p className="field-hint">Seleccioná una caja en el menú.</p>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h2>Acciones de crédito</h2>
            <p style={{ fontSize: "0.85rem" }}>
              Si el colateral ya no cubre el principal on-chain + margen, liquidá:
              regla Pyth{" "}
              <code className="mono" style={{ fontSize: "0.75rem" }}>
                price × qty × 100 &lt; principal × 110
              </code>
              . El pool demo suma un excedente simulado por la “venta”.
            </p>
            <div className="row" style={{ flexWrap: "wrap", gap: "0.6rem" }}>
              <button
                type="button"
                className="danger"
                disabled={!selRef || !!busy || !health?.hasAccessToken}
                onClick={() =>
                  run("liq", async () => {
                    const [txHash, outputIndex] = selRef!.split("#");
                    const v = vaults.find((x) => x.ref === selRef);
                    const { txHash: h } = await api<{ txHash: string }>(
                      "/api/vault/liquidate",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          txHash,
                          outputIndex: Number(outputIndex),
                          priceFeedId: Number(v?.datum.feedId ?? feedId),
                        }),
                      },
                    );
                    setMsg({ type: "ok", text: `liquidate tx ${h}` });
                    setSelRef(null);
                    await afterChainAction();
                  })
                }
              >
                Liquidar (Pyth)
              </button>
            </div>
            <hr className="sep" />
            <div className="field">
              <label htmlFor="ndebt">Nueva deuda (Adjust)</label>
              <input
                id="ndebt"
                value={newDebt}
                onChange={(e) => setNewDebt(e.target.value)}
              />
            </div>
            <div className="row">
              <button
                type="button"
                disabled={!selRef || !!busy}
                onClick={() =>
                  run("adj", async () => {
                    const [txHash, outputIndex] = selRef!.split("#");
                    const { txHash: h } = await api<{ txHash: string }>(
                      "/api/vault/adjust",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          txHash,
                          outputIndex: Number(outputIndex),
                          newDebtLovelace: newDebt,
                        }),
                      },
                    );
                    setMsg({ type: "ok", text: `adjustDebt tx ${h}` });
                    await afterChainAction();
                  })
                }
              >
                Ajustar deuda
              </button>
              <button
                type="button"
                disabled={!selRef || !!busy}
                onClick={() =>
                  run("close", async () => {
                    const [txHash, outputIndex] = selRef!.split("#");
                    const { txHash: h } = await api<{ txHash: string }>(
                      "/api/vault/close",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          txHash,
                          outputIndex: Number(outputIndex),
                        }),
                      },
                    );
                    setMsg({ type: "ok", text: `closeVault tx ${h}` });
                    setSelRef(null);
                    await afterChainAction();
                  })
                }
              >
                Cerrar vault (debt=0)
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "seguros" && (
        <>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>Seguro paramétrico + pool</h2>
            <p style={{ fontSize: "0.88rem" }}>
              <code>strike</code> y <code>payout</code> en el datum. El pool aparta
              tADA; si no alcanza, la API rechaza la cobertura. Al cobrar, un{" "}
              <strong>fee demo</strong> queda en el pool; el resto es pago
              simulado al asegurado.
            </p>
          </div>

          <div className="grid grid-2" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <h2>Aportar al pool (on-chain)</h2>
              <p style={{ fontSize: "0.82rem" }}>
                Depósitos al script{" "}
                <code className="mono">liquidity_pool</code> en PreProd (Lucid).
                El panel del pool se calcula desde la cadena (sin archivo de
                balances).
              </p>
              <p className="field-hint">
                Saldo wallet (proveedor / Evolution):{" "}
                <span className="mono">
                  {wallet?.lovelace ?? "—"} lovelace (~{wallet?.adaApprox ?? "?"}{" "}
                  tADA)
                </span>
              </p>
              <div className="field">
                <label htmlFor="dep-onchain">Lovelace a depositar</label>
                <input
                  id="dep-onchain"
                  value={onchainPoolLovelace}
                  onChange={(e) => setOnchainPoolLovelace(e.target.value)}
                />
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="primary"
                  disabled={
                    !!busy ||
                    !health?.hasMnemonic ||
                    !health?.hasBlockfrostOrMaestro
                  }
                  title="Transacción PreProd al script liquidity_pool"
                  onClick={() =>
                    run("pool-onchain-fixed", async () => {
                      const j = await api<{
                        txHash: string;
                        depositedLovelace: string;
                      }>("/api/pool/onchain/deposit", {
                        method: "POST",
                        body: JSON.stringify({
                          lovelace: onchainPoolLovelace.trim(),
                        }),
                      });
                      setMsg({
                        type: "ok",
                        text: `On-chain: ${j.depositedLovelace} lovelace. Tx ${j.txHash}`,
                      });
                      await afterChainAction();
                    })
                  }
                >
                  Depositar cantidad fija (on-chain)
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={
                    !!busy ||
                    !health?.hasMnemonic ||
                    !health?.hasBlockfrostOrMaestro ||
                    !wallet?.lovelace ||
                    wallet.lovelace === "0"
                  }
                  title="Transacción real PreProd al script liquidity_pool (deja reserva para fees)"
                  onClick={() =>
                    run("pool-onchain-80", async () => {
                      const j = await api<{
                        txHash: string;
                        depositedLovelace: string;
                        walletLovelace: string;
                        percent: number;
                        liquidityPoolAddressBech32: string;
                      }>("/api/pool/onchain/deposit-percent", {
                        method: "POST",
                        body: JSON.stringify({ percent: 80 }),
                      });
                      setMsg({
                        type: "ok",
                        text: `On-chain: ${j.depositedLovelace} lovelace al pool (${j.percent}%). Tx ${j.txHash}`,
                      });
                      await afterChainAction();
                    })
                  }
                >
                  Enviar 80% al contrato pool (on-chain)
                </button>
                <button
                  type="button"
                  disabled={
                    !!busy ||
                    !health?.hasMnemonic ||
                    !health?.hasBlockfrostOrMaestro
                  }
                  title="Gasta todos los UTxOs del pool con tu payment key en el datum (Evolution + Plutus V3)"
                  onClick={() =>
                    run("pool-onchain-withdraw", async () => {
                      const j = await api<{
                        txHash: string;
                        withdrawnLovelace: string;
                        inputCount: number;
                      }>("/api/pool/onchain/withdraw-all", { method: "POST" });
                      setMsg({
                        type: "ok",
                        text: `Retirado on-chain ${j.withdrawnLovelace} lovelace (${j.inputCount} UTxOs). Tx ${j.txHash}`,
                      });
                      await afterChainAction();
                    })
                  }
                >
                  Retirar todo del pool (on-chain)
                </button>
              </div>
              {pool && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                  Disponible ahora:{" "}
                  <span className="mono">{pool.availableLovelace}</span> ·
                  Apartado:{" "}
                  <span className="mono">{pool.encumberedLovelace}</span>
                </p>
              )}
            </div>

            <div className="card">
              <h2>Reservas del pool</h2>
              {!pool || pool.reservations.length === 0 ? (
                <p>Ninguna reserva activa.</p>
              ) : (
                <ul className="compact">
                  {pool.reservations.map((r, i) => (
                    <li key={`${r.vaultRef}-${i}`} className="mono">
                      {r.payoutLovelace} ₳ raw cap · vault {shortTx(r.vaultRef, 20)}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                style={{ marginTop: "0.5rem" }}
                disabled={!!busy}
                onClick={() => run("pool-r", refreshPool)}
              >
                Refrescar
              </button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>Caja para cobertura y cobro</h2>
            {vaults.length === 0 ? (
              <p>
                Necesitás una caja con NFT adentro. Creala en{" "}
                <strong>Préstamo</strong>.
              </p>
            ) : (
              <>
                {vaultSelect}
                {selectedVault ? (
                  <VaultContentsCard
                    vault={selectedVault}
                    shadowNfts={wallet?.shadowNfts ?? []}
                    nativeNfts={wallet?.nativeNfts ?? []}
                    demoFeeds={demoFeedsLite}
                    heading="Qué NFT estás asegurando"
                  />
                ) : (
                  <p className="field-hint">Elegí una caja para ver el NFT y el estado.</p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-2" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <h2>Activar / actualizar cobertura</h2>
              <p style={{ fontSize: "0.82rem" }}>
                Tras la tx, el servidor intenta apartar fondos del pool (ledger)
                según el payout indicado (puede quedar shortfall si el pool está
                vacío).
              </p>
              <div className="field">
                <label htmlFor="strike">strike_raw</label>
                <input
                  id="strike"
                  value={strikeRaw}
                  onChange={(e) => setStrikeRaw(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="pay">payout_lovelace (tope reserva)</label>
                <input
                  id="pay"
                  value={payoutLovelace}
                  onChange={(e) => setPayoutLovelace(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={!selRef || !!busy}
                onClick={() =>
                  run("hedge", async () => {
                    const [txHash, outputIndex] = selRef!.split("#");
                    const j = await api<{
                      txHash: string;
                      poolVaultRef: string | null;
                    }>("/api/vault/hedge", {
                      method: "POST",
                      body: JSON.stringify({
                        txHash,
                        outputIndex: Number(outputIndex),
                        strikeRaw,
                        payoutLovelace,
                      }),
                    });
                    setMsg({
                      type: "ok",
                      text: `applyHedge tx ${j.txHash}${j.poolVaultRef ? ` · pool ref ${j.poolVaultRef}` : ""}`,
                    });
                    await afterChainAction();
                    await refreshRisk();
                  })
                }
              >
                Activar cobertura
              </button>
            </div>

            <div className="card">
              <h2>Condición de mercado y cobro</h2>
              {!risk ? (
                <p>Seleccioná una vault.</p>
              ) : (
                <>
                  <div className="row" style={{ marginBottom: "0.5rem" }}>
                    <span
                      className={
                        risk.marketOpen === true || Boolean(risk.quote?.priceRaw)
                          ? "badge ok"
                          : "badge neutral"
                      }
                    >
                      {risk.marketLabel ??
                        (risk.quote?.priceRaw
                          ? "Mercado abierto"
                          : "Mercado cerrado")}
                    </span>
                  </div>
                  {risk.marketHint && (
                    <p style={{ fontSize: "0.8rem" }}>{risk.marketHint}</p>
                  )}
                  {risk.loanPoolNote && (
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                      {risk.loanPoolNote}
                    </p>
                  )}
                  {risk.quote?.priceRaw ? (
                    <p>
                      Precio raw:{" "}
                      <strong className="mono">{risk.quote.priceRaw}</strong>
                      {risk.quote.humanApprox && (
                        <> · ≈ {risk.quote.humanApprox}</>
                      )}
                    </p>
                  ) : (
                    <p style={{ fontSize: "0.85rem" }}>
                      {risk.note ?? "Sin precio parseado."}
                    </p>
                  )}
                  <p style={{ fontSize: "0.82rem" }}>
                    Cobro (claim): precio Pyth &lt; strike y testigo en la tx.
                  </p>
                  <div className="row" style={{ marginTop: "0.5rem" }}>
                    {risk.hedge ? (
                      risk.claimEligible ? (
                        <span className="badge warn">Indemnización habilitada (precio &lt; strike)</span>
                      ) : (
                        <span className="badge ok">Condición de cobro no cumplida</span>
                      )
                    ) : (
                      <span className="badge neutral">Sin cobertura en datum</span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{ marginTop: "0.75rem" }}
                    disabled={!!busy}
                    onClick={() => run("risk", refreshRisk)}
                  >
                    Refrescar precio / condiciones
                  </button>
                  <hr className="sep" />
                  <button
                    type="button"
                    disabled={!selRef || !!busy || !health?.hasAccessToken}
                    onClick={() =>
                      run("claim", async () => {
                        const [txHash, outputIndex] = selRef!.split("#");
                        const v = vaults.find((x) => x.ref === selRef);
                        const { txHash: h } = await api<{ txHash: string }>(
                          "/api/vault/claim",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              txHash,
                              outputIndex: Number(outputIndex),
                              priceFeedId: Number(v?.datum.feedId ?? feedId),
                            }),
                          },
                        );
                        setMsg({ type: "ok", text: `claimInsurance tx ${h}` });
                        setSelRef(null);
                        await afterChainAction();
                      })
                    }
                  >
                    Cobrar indemnización (owner)
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      </div>
    </div>
  );
}
