import type { ReactNode } from "react";

export type ShadowNftLite = {
  policyId: string;
  nameHex: string;
  nameUtf8: string;
  feedId: number;
};

export type NativeNftLite = {
  policyId: string;
  nameHex: string;
  nameUtf8?: string;
};

export type DemoFeedLite = {
  feedId: number;
  uiTitle: string;
  slot: string;
};

export type VaultForDisplay = {
  ref: string;
  txHash: string;
  outputIndex: string;
  lovelace: string;
  datum: {
    debtLovelace: string;
    collateralQty: string;
    feedId: string;
    nftPolicyHex: string;
    nftNameHex: string;
    hedge: null | { strikeRaw: string; payoutLovelace: string };
  };
};

export function formatTAdaFromLovelace(lovelace: string): string {
  try {
    const n = BigInt(lovelace || "0");
    const whole = n / 1_000_000n;
    const frac = n % 1_000_000n;
    const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr}` : `${whole}`;
  } catch {
    return lovelace || "0";
  }
}

function tryDecodeNameFromHex(hex: string): string | null {
  const clean = hex.replace(/\s/g, "").toLowerCase();
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) {
    return null;
  }
  try {
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    const dec = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const t = dec.trim();
    if (t.length < 2 || t.length > 80) return null;
    if (!/^[\p{L}\p{N}\s._\-/+]+$/u.test(t)) return null;
    return t;
  } catch {
    return null;
  }
}

export function resolveVaultNftSummary(
  v: VaultForDisplay,
  shadowNfts: ShadowNftLite[],
  demoFeeds: DemoFeedLite[] | null,
  nativeNfts?: NativeNftLite[] | null,
): {
  title: string;
  tagline: string;
  feedLabel: string;
  knownFromWallet: boolean;
  slotHint: string | null;
} {
  const pol = v.datum.nftPolicyHex.replace(/\s/g, "").toLowerCase();
  const nm = v.datum.nftNameHex.replace(/\s/g, "").toLowerCase();
  const match = (s: { policyId: string; nameHex: string }) =>
    s.policyId.toLowerCase() === pol && s.nameHex.toLowerCase() === nm;
  const shadowHit = shadowNfts.find(match);
  const nativeHit = nativeNfts?.find(match);
  const fromHex = tryDecodeNameFromHex(v.datum.nftNameHex);
  const fid = Number(v.datum.feedId);
  const feedRow = demoFeeds?.find((f) => f.feedId === fid);
  const feedLabel = feedRow?.uiTitle ?? `Precio Pyth · id ${v.datum.feedId}`;
  const slotHint = feedRow?.slot ?? null;

  if (shadowHit) {
    return {
      title: shadowHit.nameUtf8 || fromHex || "NFT sombra",
      tagline:
        "Mismo activo que figura en tu lista de NFTs demo (sombra). Está bloqueado en el contrato.",
      feedLabel,
      knownFromWallet: true,
      slotHint,
    };
  }
  if (nativeHit) {
    return {
      title: nativeHit.nameUtf8 ?? fromHex ?? "Activo nativo",
      tagline:
        "Coincide con un token en tu wallet Lucid (lista completa de nativos).",
      feedLabel,
      knownFromWallet: true,
      slotHint,
    };
  }
  return {
    title: fromHex || "Activo tokenizado (NFT)",
    tagline:
      "Identificadores del token debajo (policy + nombre). Si lo minteaste con esta demo, suele coincidir con un “shadow NFT”.",
    feedLabel,
    knownFromWallet: false,
    slotHint,
  };
}

type VaultContentsCardProps = {
  vault: VaultForDisplay;
  shadowNfts: ShadowNftLite[];
  /** Lista Lucid completa (opcional) para reconocer nombres fuera de shadow. */
  nativeNfts?: NativeNftLite[] | null;
  demoFeeds: DemoFeedLite[] | null;
  /** Título de sección encima de la tarjeta */
  heading?: string;
  intro?: ReactNode;
  defaultOpenTechnical?: boolean;
};

export function VaultContentsCard({
  vault,
  shadowNfts,
  nativeNfts = null,
  demoFeeds,
  heading = "Qué hay dentro del vault",
  intro,
  defaultOpenTechnical = false,
}: VaultContentsCardProps) {
  const s = resolveVaultNftSummary(vault, shadowNfts, demoFeeds, nativeNfts);
  const hasHedge = Boolean(vault.datum.hedge);
  const ada = formatTAdaFromLovelace(vault.lovelace);

  return (
    <div className="vault-contents">
      {heading && <p className="kicker">{heading}</p>}
      {intro}
      <div className="vault-contents__hero">
        <div className="vault-contents__icon" aria-hidden>
          <span className="vault-contents__icon-inner">NFT</span>
        </div>
        <div className="vault-contents__hero-text">
          <h3 className="vault-contents__title">{s.title}</h3>
          <p className="vault-contents__tagline">{s.tagline}</p>
          <div className="vault-contents__chips">
            <span className="chip">{s.feedLabel}</span>
            {s.knownFromWallet ? (
              <span className="chip chip--ok">Reconocido en wallet demo</span>
            ) : (
              <span className="chip chip--neutral">Solo datos on-chain</span>
            )}
            {hasHedge ? (
              <span className="chip chip--warn">Cobertura activa</span>
            ) : (
              <span className="chip">Sin cobertura</span>
            )}
          </div>
        </div>
      </div>

      <div className="stat-grid" aria-label="Resumen numérico">
        <div className="stat-tile">
          <span className="stat-tile__label">tADA en esta posición</span>
          <span className="stat-tile__value">{ada}</span>
          <span className="stat-tile__hint">Lovelace en el UTxO: {vault.lovelace}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Principal préstamo (datum)</span>
          <span className="stat-tile__value">
            {formatTAdaFromLovelace(vault.datum.debtLovelace)} tADA
          </span>
          <span className="stat-tile__hint">{vault.datum.debtLovelace} lovelace</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Cantidad colateral (escala)</span>
          <span className="stat-tile__value">{vault.datum.collateralQty}</span>
          <span className="stat-tile__hint">Usada en la fórmula de liquidación</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Cobertura (seguro)</span>
          <span className="stat-tile__value">
            {hasHedge ? "Sí" : "No"}
          </span>
          <span className="stat-tile__hint">
            {hasHedge
              ? `Tope ${vault.datum.hedge!.payoutLovelace} lovelace`
              : "Activar en Seguros"}
          </span>
        </div>
      </div>

      <details
        className="technical-block"
        {...(defaultOpenTechnical ? { open: true } : {})}
      >
        <summary>Datos técnicos (on-chain)</summary>
        <dl className="technical-dl">
          <dt>Referencia UTxO</dt>
          <dd className="mono">{vault.ref}</dd>
          <dt>Transacción · índice</dt>
          <dd className="mono">
            {vault.txHash} · #{vault.outputIndex}
          </dd>
          <dt>Policy id (hex)</dt>
          <dd className="mono">{vault.datum.nftPolicyHex}</dd>
          <dt>Nombre del activo (hex)</dt>
          <dd className="mono">{vault.datum.nftNameHex}</dd>
          <dt>Feed Pyth (id)</dt>
          <dd className="mono">{vault.datum.feedId}</dd>
          {hasHedge && (
            <>
              <dt>Strike raw</dt>
              <dd className="mono">{vault.datum.hedge!.strikeRaw}</dd>
              <dt>Payout lovelace</dt>
              <dd className="mono">{vault.datum.hedge!.payoutLovelace}</dd>
            </>
          )}
        </dl>
      </details>
    </div>
  );
}

export function VaultMiniCard({
  vault,
  shadowNfts,
  nativeNfts = null,
  demoFeeds,
  selected,
  onSelect,
}: {
  vault: VaultForDisplay;
  shadowNfts: ShadowNftLite[];
  nativeNfts?: NativeNftLite[] | null;
  demoFeeds: DemoFeedLite[] | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const s = resolveVaultNftSummary(vault, shadowNfts, demoFeeds, nativeNfts);
  return (
    <button
      type="button"
      className={`vault-mini ${selected ? "vault-mini--selected" : ""}`}
      onClick={onSelect}
    >
      <span className="vault-mini__title">{s.title}</span>
      <span className="vault-mini__meta">
        {s.feedLabel} · principal {formatTAdaFromLovelace(vault.datum.debtLovelace)} tADA
      </span>
    </button>
  );
}
