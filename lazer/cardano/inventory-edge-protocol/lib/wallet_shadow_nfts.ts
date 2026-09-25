/**
 * List shadow demo NFTs from the Lucid wallet (Blockfrost/Maestro UTxO set).
 */
import type { UTxO } from "lucid-cardano";

import * as Address from "@evolution-sdk/evolution/Address";

import { inferFeedFromShadowName } from "./feeds.js";
import { withLucidPreprod } from "./mint_shadow.js";
import { paymentKeyHashBytes } from "./vault_address.js";

function normalizeHex(h: string): string {
  return h.replace(/\s/g, "").toLowerCase();
}

function nativeUnitsFromUtxo(u: UTxO): { unit: string; qty: bigint }[] {
  const out: { unit: string; qty: bigint }[] = [];
  for (const [k, v] of Object.entries(u.assets)) {
    if (k === "lovelace") continue;
    out.push({ unit: k, qty: v as bigint });
  }
  return out;
}

export type WalletShadowNft = {
  policyId: string;
  nameHex: string;
  nameUtf8: string;
  unit: string;
  feedId: number;
  utxoLovelace: string;
};

/** Cualquier activo nativo en la wallet Lucid (misma vista que `openVault`). */
export type WalletNativeNft = {
  policyId: string;
  nameHex: string;
  nameUtf8?: string;
  quantity: string;
  unit: string;
  /** Al menos un UTxO tiene qty 1 de esta unit (requerido para `openVault`). */
  hasSingletonUtxo: boolean;
  /** Si el nombre es shadow demo, sugerimos el feed Pyth del mint. */
  suggestedFeedId?: number;
};

function shadowNftsFromUtxos(utxos: UTxO[]): WalletShadowNft[] {
  const byKey = new Map<string, WalletShadowNft>();

  for (const u of utxos) {
    for (const { unit, qty } of nativeUnitsFromUtxo(u)) {
      if (qty !== 1n) continue;
      const policyId = unit.slice(0, 56);
      const nameHex = unit.slice(56);
      let nameUtf8: string;
      try {
        nameUtf8 = Buffer.from(nameHex, "hex").toString("utf8");
      } catch {
        continue;
      }
      if (!nameUtf8.startsWith("Shadow")) continue;
      const feedId = inferFeedFromShadowName(nameUtf8);
      if (feedId == null) continue;
      const key = normalizeHex(policyId) + normalizeHex(nameHex);
      if (byKey.has(key)) continue;
      byKey.set(key, {
        policyId: normalizeHex(policyId),
        nameHex: normalizeHex(nameHex),
        nameUtf8,
        unit: normalizeHex(policyId) + normalizeHex(nameHex),
        feedId,
        utxoLovelace: (u.assets.lovelace ?? 0n).toString(),
      });
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.nameUtf8.localeCompare(b.nameUtf8),
  );
}

function nativeNftsFromUtxos(utxos: UTxO[]): WalletNativeNft[] {
  const agg = new Map<string, bigint>();
  const singletonUnit = new Set<string>();

  for (const u of utxos) {
    for (const { unit, qty } of nativeUnitsFromUtxo(u)) {
      if (qty <= 0n) continue;
      const key = normalizeHex(unit);
      agg.set(key, (agg.get(key) ?? 0n) + qty);
      if (qty === 1n) singletonUnit.add(key);
    }
  }

  const nfts: WalletNativeNft[] = [];
  for (const [unit, quantity] of agg) {
    const policyId = unit.slice(0, 56);
    const nameHex = unit.slice(56);
    let nameUtf8: string | undefined;
    try {
      const s = Buffer.from(nameHex, "hex").toString("utf8");
      if (!s.includes("\uFFFD")) nameUtf8 = s;
    } catch {
      /* nombre binario */
    }
    const shadowFeed =
      nameUtf8?.startsWith("Shadow") === true
        ? inferFeedFromShadowName(nameUtf8)
        : null;
    nfts.push({
      policyId,
      nameHex,
      nameUtf8,
      quantity: quantity.toString(),
      unit,
      hasSingletonUtxo: singletonUnit.has(unit),
      suggestedFeedId: shadowFeed ?? undefined,
    });
  }

  nfts.sort((a, b) => {
    if (a.hasSingletonUtxo !== b.hasSingletonUtxo) {
      return a.hasSingletonUtxo ? -1 : 1;
    }
    const qa = BigInt(a.quantity);
    const qb = BigInt(b.quantity);
    if (qa === 1n && qb !== 1n) return -1;
    if (qb === 1n && qa !== 1n) return 1;
    return (a.nameUtf8 ?? a.unit).localeCompare(b.nameUtf8 ?? b.unit);
  });

  return nfts;
}

/**
 * Una sesión Lucid + un `getUtxos` para sombras y nativos (evita dos `Lucid.new` por request).
 */
export async function listWalletShadowAndNative(mnemonic: string): Promise<{
  shadows: { address: string; nfts: WalletShadowNft[] };
  native: {
    address: string;
    paymentKeyHashHex: string;
    nfts: WalletNativeNft[];
  };
}> {
  return withLucidPreprod(async (lucid) => {
    lucid.selectWalletFromSeed(mnemonic);
    const address = await lucid.wallet.address();
    const paymentKeyHashHex = Buffer.from(
      paymentKeyHashBytes(Address.fromBech32(address)),
    ).toString("hex");
    const utxos = await lucid.wallet.getUtxos();
    return {
      shadows: { address, nfts: shadowNftsFromUtxos(utxos) },
      native: {
        address,
        paymentKeyHashHex,
        nfts: nativeNftsFromUtxos(utxos),
      },
    };
  });
}
