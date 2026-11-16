import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

import { quoteChainForVaultFeedId, type LazerQuoteStep } from "./feeds.js";

export type FeedQuote = {
  priceFeedId: number;
  priceRaw?: string;
  exponent?: number;
  humanApprox?: string;
};

export type ResolvedFeedQuote = FeedQuote & {
  /** Símbolo Pro del feed que aportó `price`. */
  resolvedProSymbol?: string;
  quoteNote?: string;
};

function requireToken(): string {
  const t = process.env.ACCESS_TOKEN;
  if (!t) throw new Error("Missing ACCESS_TOKEN (Pyth Lazer)");
  return t;
}

function humanFromRaw(priceRaw: string, exp: number | undefined): string | undefined {
  try {
    const n = BigInt(priceRaw);
    if (exp === undefined) return undefined;
    if (exp >= 0) return (n * 10n ** BigInt(exp)).toString();
    const den = 10n ** BigInt(-exp);
    const whole = n / den;
    const frac = n % den;
    if (frac === 0n) return whole.toString();
    let fs = frac.toString().padStart(-exp, "0").replace(/0+$/, "");
    if (fs === "") return whole.toString();
    return `${whole}.${fs}`;
  } catch {
    return undefined;
  }
}

/**
 * Recorre la cadena hasta el primer feed con `price` en JSON parseado.
 * (Lazer omite `price` cuando `publisherCount` es 0 aunque exista binario Solana.)
 */
export async function fetchFeedQuoteResolved(
  chain: readonly LazerQuoteStep[],
  options?: { emptyNote?: string },
): Promise<ResolvedFeedQuote> {
  const lazer = await PythLazerClient.create({ token: requireToken() });
  for (let i = 0; i < chain.length; i++) {
    const step = chain[i]!;
    const u = await lazer.getLatestPrice({
      channel: step.channel,
      formats: ["solana"],
      jsonBinaryEncoding: "hex",
      priceFeedIds: [step.id],
      properties: ["price", "exponent"],
      parsed: true,
    });
    const f = u.parsed?.priceFeeds?.[0];
    if (f?.price) {
      return {
        priceFeedId: step.id,
        priceRaw: f.price,
        exponent: f.exponent,
        humanApprox: humanFromRaw(f.price, f.exponent),
        resolvedProSymbol: step.proSymbol,
        quoteNote:
          i === 0
            ? undefined
            : `Sin publicadores en feeds anteriores; precio vía ${step.proSymbol} (id ${step.id}).`,
      };
    }
  }
  const head = chain[0]!;
  return {
    priceFeedId: head.id,
    quoteNote:
      options?.emptyNote ??
      "Ningún feed de la cadena tiene `price` en JSON (0 publicadores / mercado cerrado).",
  };
}

/** Una cotización por id pedido, con cadena de resolución estándar (vault / genérico). */
export async function fetchFeedQuotes(
  priceFeedIds: number[],
): Promise<ResolvedFeedQuote[]> {
  const out: ResolvedFeedQuote[] = [];
  for (const id of priceFeedIds) {
    out.push(await fetchFeedQuoteResolved(quoteChainForVaultFeedId(id)));
  }
  return out;
}

/**
 * Underwater iff price * collateralQty * 100 < debtLovelace * 110 (matches `vault.ak` Liquidate).
 */
export function isUnderwater(params: {
  priceRaw: bigint;
  collateralQty: bigint;
  debtLovelace: bigint;
}): boolean {
  if (params.debtLovelace <= 0n) return false;
  const lhs = params.priceRaw * params.collateralQty * 100n;
  const rhs = params.debtLovelace * 110n;
  return lhs < rhs;
}

/**
 * Mínimo entero `collateral_qty` para que NO esté underwater con ese principal:
 * `priceRaw * qty * 100 >= debtLovelace * 110` (misma escala que `vault.ak` Liquidate).
 */
export function minCollateralQtyForDebt(
  debtLovelace: bigint,
  priceRaw: bigint,
): bigint {
  if (priceRaw <= 0n) {
    throw new Error("priceRaw must be positive");
  }
  if (debtLovelace <= 0n) return 1n;
  const num = debtLovelace * 110n;
  const den = priceRaw * 100n;
  if (den === 0n) throw new Error("invalid price scale");
  return (num + den - 1n) / den;
}

/** Mínimo + colchón (bps sobre el mínimo; default 25%). */
export function suggestedCollateralQtyForDebt(
  debtLovelace: bigint,
  priceRaw: bigint,
  bufferBps: bigint = 2500n,
): bigint {
  const min = minCollateralQtyForDebt(debtLovelace, priceRaw);
  if (debtLovelace <= 0n) return min;
  return (min * (10000n + bufferBps) + 9999n) / 10000n;
}
