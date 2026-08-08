/**
 * Pyth Pro (Lazer) feed ids + canales mínimos por símbolo.
 * @see https://docs.pyth.network/price-feeds/pro/price-feed-ids
 * @see https://history.pyth-lazer.dourolabs.app/history/v1/symbols
 */
export type LazerChannel =
  | "real_time"
  | "fixed_rate@50ms"
  | "fixed_rate@200ms";

/** Registro por clave interna (vault / mint). */
export const LAZER_FEED_BY_KEY = {
  XAU_USD: {
    id: 346,
    /** Símbolo oficial Pyth Pro */
    proSymbol: "Metal.XAU/USD",
    channel: "fixed_rate@200ms" as const,
    uiTitle: "Oro (XAU/USD)",
  },
  /**
   * Spot WTI (`Commodities.WTI/USD`, id 344) figura *inactive* en Symbols API.
   * Usamos futuro estable listado como `stable` (contrato rolado; revisar IDs al cambiar de mes).
   */
  WTI_USD: {
    id: 2694,
    proSymbol: "Commodities.WTIK6/USD",
    channel: "fixed_rate@50ms" as const,
    uiTitle: "Petróleo WTI (futuro)",
  },
  /** `Crypto.BTC/USD` exige canal `real_time` (no `fixed_rate@200ms`). */
  BTC_USD: {
    id: 1,
    proSymbol: "Crypto.BTC/USD",
    channel: "real_time" as const,
    uiTitle: "Bitcoin (BTC/USD)",
  },
} as const;

export const PYTH_LAZER_FEEDS = {
  XAU_USD: LAZER_FEED_BY_KEY.XAU_USD.id,
  WTI_USD: LAZER_FEED_BY_KEY.WTI_USD.id,
  BTC_USD: LAZER_FEED_BY_KEY.BTC_USD.id,
} as const;

/** Id antiguo del demo (inactivo en Lazer); solo para canal por defecto si aparece en vaults viejas. */
export const LAZER_LEGACY_WTI_FEED_ID = 233;

export type ShadowAssetKey = keyof typeof PYTH_LAZER_FEEDS;

export type DemoSlot = "metal" | "oil" | "stock";

export const DEMO_SLOT_TO_KEY: Record<DemoSlot, ShadowAssetKey> = {
  metal: "XAU_USD",
  oil: "WTI_USD",
  stock: "BTC_USD",
};

export const DEMO_SLOT_LABEL: Record<
  DemoSlot,
  { title: string; subtitle: string }
> = {
  metal: {
    title: LAZER_FEED_BY_KEY.XAU_USD.uiTitle,
    subtitle: `${LAZER_FEED_BY_KEY.XAU_USD.proSymbol} · id ${LAZER_FEED_BY_KEY.XAU_USD.id}`,
  },
  oil: {
    title: LAZER_FEED_BY_KEY.WTI_USD.uiTitle,
    subtitle: `${LAZER_FEED_BY_KEY.WTI_USD.proSymbol} · id ${LAZER_FEED_BY_KEY.WTI_USD.id}`,
  },
  stock: {
    title: LAZER_FEED_BY_KEY.BTC_USD.uiTitle,
    subtitle: `${LAZER_FEED_BY_KEY.BTC_USD.proSymbol} · id ${LAZER_FEED_BY_KEY.BTC_USD.id}`,
  },
};

/** Feed ids for the three judge demo assets (same order as mint slots). */
export const DEMO_PYTH_FEED_IDS: readonly number[] = [
  PYTH_LAZER_FEEDS.XAU_USD,
  PYTH_LAZER_FEEDS.WTI_USD,
  PYTH_LAZER_FEEDS.BTC_USD,
];

/** Un paso en la cadena HTTP `latest_price` (id + canal mínimo + etiqueta Pro). */
export type LazerQuoteStep = {
  id: number;
  channel: LazerChannel;
  proSymbol: string;
};

/**
 * Cuando `Metal.XAU/USD` (346) devuelve `publisherCount: 0` (mercado NY cerrado),
 * Lazer no incluye `price` en JSON — usamos XAUT (oro tokenizado), suele tener datos 24/7.
 */
export const LAZER_XAUT_FALLBACK_ID = 172;

/**
 * Varios futuros energy `stable`; se prueban en orden hasta que alguno tenga `price`.
 * (Fuera de horario pueden quedar todos en 0 publicadores.)
 */
export const LAZER_OIL_QUOTE_CHAIN: readonly LazerQuoteStep[] = [
  { id: 2694, channel: "fixed_rate@50ms", proSymbol: "Commodities.WTIK6/USD" },
  { id: 2698, channel: "fixed_rate@50ms", proSymbol: "Commodities.BRENTK6/USD" },
  { id: 3032, channel: "fixed_rate@50ms", proSymbol: "Commodities.WTIM6/USD" },
  { id: 3040, channel: "fixed_rate@50ms", proSymbol: "Commodities.BRENTM6/USD" },
  { id: 3041, channel: "fixed_rate@50ms", proSymbol: "Commodities.BRENTN6/USD" },
  { id: 3007, channel: "fixed_rate@50ms", proSymbol: "Commodities.NGDM6/USD" },
];

const OIL_FEED_IDS = new Set(LAZER_OIL_QUOTE_CHAIN.map((s) => s.id));

/** Canal Lazer a usar en `getLatestPrice` / payload Solana (por id numérico). */
export function lazerChannelForFeedId(feedId: number): LazerChannel {
  if (feedId === LAZER_XAUT_FALLBACK_ID) return "fixed_rate@200ms";
  for (const k of Object.keys(LAZER_FEED_BY_KEY) as ShadowAssetKey[]) {
    const m = LAZER_FEED_BY_KEY[k];
    if (m.id === feedId) return m.channel;
  }
  if (OIL_FEED_IDS.has(feedId)) return "fixed_rate@50ms";
  if (feedId === LAZER_LEGACY_WTI_FEED_ID) return "fixed_rate@200ms";
  return "fixed_rate@200ms";
}

/** Cadena para las tarjetas del judge UI (metal = spot oro → XAUT). */
export function quoteChainForDemoSlot(slot: DemoSlot): readonly LazerQuoteStep[] {
  if (slot === "metal") {
    return [
      {
        id: LAZER_FEED_BY_KEY.XAU_USD.id,
        channel: LAZER_FEED_BY_KEY.XAU_USD.channel,
        proSymbol: LAZER_FEED_BY_KEY.XAU_USD.proSymbol,
      },
      {
        id: LAZER_XAUT_FALLBACK_ID,
        channel: "fixed_rate@200ms",
        proSymbol: "Crypto.XAUT/USD",
      },
    ];
  }
  if (slot === "oil") return LAZER_OIL_QUOTE_CHAIN;
  return [
    {
      id: LAZER_FEED_BY_KEY.BTC_USD.id,
      channel: LAZER_FEED_BY_KEY.BTC_USD.channel,
      proSymbol: LAZER_FEED_BY_KEY.BTC_USD.proSymbol,
    },
  ];
}

/** Cadena para `/api/risk` según el `feed_id` guardado en el datum de la vault. */
export function quoteChainForVaultFeedId(feedId: number): readonly LazerQuoteStep[] {
  const fid = Number(feedId);
  if (fid === LAZER_FEED_BY_KEY.XAU_USD.id || fid === 1521) {
    return quoteChainForDemoSlot("metal");
  }
  if (fid === LAZER_XAUT_FALLBACK_ID) {
    return [
      {
        id: LAZER_XAUT_FALLBACK_ID,
        channel: "fixed_rate@200ms",
        proSymbol: "Crypto.XAUT/USD",
      },
    ];
  }
  if (fid === LAZER_LEGACY_WTI_FEED_ID) {
    return [...LAZER_OIL_QUOTE_CHAIN];
  }
  const oi = LAZER_OIL_QUOTE_CHAIN.findIndex((s) => s.id === fid);
  if (oi >= 0) {
    const tail = LAZER_OIL_QUOTE_CHAIN.slice(oi);
    const head = LAZER_OIL_QUOTE_CHAIN.slice(0, oi);
    return [...tail, ...head];
  }
  return [
    {
      id: fid,
      channel: lazerChannelForFeedId(fid),
      proSymbol: `feed:${fid}`,
    },
  ];
}

/**
 * Infer Pyth feed from native asset name (utf8), e.g. ShadowXAU_USD_abc → 346.
 * Covers legacy `ShadowXAU_USD` (no suffix) and suffixed mints.
 */
export function inferFeedFromShadowName(nameUtf8: string): number | null {
  if (nameUtf8.startsWith("ShadowXAU_USD")) return PYTH_LAZER_FEEDS.XAU_USD;
  if (nameUtf8.startsWith("ShadowWTI_USD")) return PYTH_LAZER_FEEDS.WTI_USD;
  if (nameUtf8.startsWith("ShadowBTC_USD")) return PYTH_LAZER_FEEDS.BTC_USD;
  return null;
}

export const SHADOW_ASSETS: Record<
  ShadowAssetKey,
  { label: string; description: string }
> = {
  XAU_USD: {
    label: "Shadow Gold (XAU)",
    description: "Metal.XAU/USD — oro spot Pyth Pro",
  },
  WTI_USD: {
    label: "Shadow WTI",
    description: "Commodities.WTIK6/USD — futuro WTI (spot WTI/USD legacy inactivo)",
  },
  BTC_USD: {
    label: "Shadow BTC",
    description: "Crypto.BTC/USD — Bitcoin vs USD",
  },
};
