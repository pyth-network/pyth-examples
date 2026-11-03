/**
 * Local judge demo API: signs with CARDANO_MNEMONIC from `.env` (PreProd only).
 * Run with `npm run dev:api` from repo root; UI proxies `/api` in dev.
 */
import "./load_env.js";

import * as Address from "@evolution-sdk/evolution/Address";
import * as AssetName from "@evolution-sdk/evolution/AssetName";
import * as PolicyId from "@evolution-sdk/evolution/PolicyId";
import cors from "cors";
import express from "express";

import {
  loadBlueprint,
  liquidityPoolSpendValidator,
  vaultSpendValidator,
} from "../lib/blueprint.js";
import {
  DEMO_SLOT_LABEL,
  DEMO_SLOT_TO_KEY,
  LAZER_FEED_BY_KEY,
  quoteChainForDemoSlot,
  quoteChainForVaultFeedId,
  type DemoSlot,
  type ShadowAssetKey,
  PYTH_LAZER_FEEDS,
} from "../lib/feeds.js";
import {
  listWalletShadowAndNative,
  type WalletNativeNft,
  type WalletShadowNft,
} from "../lib/wallet_shadow_nfts.js";
import { mintShadowNftSubprocess } from "../lib/mint_shadow_subprocess.js";
import { PYTH_POLICY_ID_HEX } from "../lib/pyth.js";
import {
  fetchFeedQuoteResolved,
  fetchFeedQuotes,
  isUnderwater,
  minCollateralQtyForDebt,
  suggestedCollateralQtyForDebt,
} from "../lib/pyth_quotes.js";
import {
  adjustDebt,
  applyHedge,
  claimInsurance,
  closeVault,
  getVaultUtxoByRef,
  liquidate,
  listVaultPositions,
  openVault,
  readInlineDatum,
} from "../lib/transactions.js";
import {
  decodeVaultDatum,
  type DecodedVaultDatum,
} from "../lib/vault_datum_decode.js";
import { enterpriseVaultAddress } from "../lib/vault_address.js";

import {
  createPreprodSigningClient,
  preprodChainBackendLabel,
} from "../lib/evolution_client.js";
import {
  depositLiquidityPoolOnChain,
  listPoolDepositsOnChain,
  liquidityPoolAddressBech32,
  poolDepositReserveLovelace,
  walletTotalLovelaceLucid,
  withdrawAllLiquidityPoolOnChain,
} from "../lib/pool_onchain.js";
import {
  effectiveAvailableForHedgePayout,
  getPoolStateFromChain,
  nftLoanKey,
  type PoolStateFromChain,
} from "../lib/pool_chain_state.js";
import { appendAudit, readAudit } from "../lib/judge_store.js";

const PORT = Number(process.env.JUDGE_API_PORT ?? 8787);

/** Referencia en textos de auditoría (la amortización no mueve tADA en cadena en este MVP). */
const LOAN_REPAY_INTEREST_BPS = 100n;

function emptyPoolState(): PoolStateFromChain {
  return {
    poolScriptTotalLovelace: "0",
    availableLovelace: "0",
    encumberedLovelace: "0",
    deployedToLoansLovelace: "0",
    totalDepositedLovelace: "0",
    totalPaidOutLovelace: "0",
    totalRepaidPrincipalLovelace: "0",
    profitsFromLoansLovelace: "0",
    profitsFromInsuranceLovelace: "0",
    reservations: [],
    outstandingLoans: {},
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function findVaultRefByNft(
  policyHex: string,
  nameHex: string,
): Promise<string | null> {
  const rows = await listVaultPositions();
  const p = policyHex.toLowerCase();
  const n = nameHex.toLowerCase();
  const hit = rows.find(
    (r) =>
      r.datum.nftPolicyHex.toLowerCase() === p &&
      r.datum.nftNameHex.toLowerCase() === n,
  );
  return hit?.ref ?? null;
}

async function findVaultRefByNftWithRetry(
  policyHex: string,
  nameHex: string,
): Promise<string | null> {
  await sleep(2000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = await findVaultRefByNft(policyHex, nameHex);
    if (ref) return ref;
    await sleep(1500);
  }
  return null;
}

function requireMnemonic(): string {
  const m = process.env.CARDANO_MNEMONIC;
  if (!m) throw new Error("CARDANO_MNEMONIC not set");
  return m;
}

function jsonDatum(d: DecodedVaultDatum) {
  return {
    ownerKeyHashHex: d.ownerKeyHashHex,
    pythPolicyHex: d.pythPolicyHex,
    nftPolicyHex: d.nftPolicyHex,
    nftNameHex: d.nftNameHex,
    debtLovelace: d.debtLovelace.toString(),
    collateralQty: d.collateralQty.toString(),
    feedId: d.feedId.toString(),
    hedge:
      d.hedge.tag === "none"
        ? null
        : {
            strikeRaw: d.hedge.strikeRaw.toString(),
            payoutLovelace: d.hedge.payoutLovelace.toString(),
          },
  };
}

function parseSlot(s: string): DemoSlot {
  if (s === "metal" || s === "oil" || s === "stock") return s;
  throw new Error('slot must be "metal", "oil", or "stock"');
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "512kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    preprod: true,
    hasMnemonic: Boolean(process.env.CARDANO_MNEMONIC?.trim()),
    hasAccessToken: Boolean(process.env.ACCESS_TOKEN?.trim()),
    hasBlockfrostOrMaestro: Boolean(
      process.env.BLOCKFROST_PROJECT_ID?.trim() ??
        process.env.MAESTRO_API_KEY?.trim(),
    ),
    /** Evolution (vault txs) usa este backend para evaluar scripts; Koios/ogmios público suele fallar. */
    evolutionChainBackend: preprodChainBackendLabel(),
  });
});

app.get("/api/config", (_req, res) => {
  try {
    const bp = loadBlueprint();
    const val = vaultSpendValidator(bp);
    const vaultAddr = enterpriseVaultAddress(val.hash);
    const poolVal = liquidityPoolSpendValidator(bp);
    const poolAddr = enterpriseVaultAddress(poolVal.hash);
    res.json({
      network: "preprod",
      vaultScriptHash: val.hash,
      vaultAddressBech32: Address.toBech32(vaultAddr),
      liquidityPoolScriptHash: poolVal.hash,
      liquidityPoolAddressBech32: Address.toBech32(poolAddr),
      poolDepositReserveLovelace: poolDepositReserveLovelace().toString(),
      pythPolicyIdHex: PYTH_POLICY_ID_HEX,
      feeds: PYTH_LAZER_FEEDS,
      demoSlots: DEMO_SLOT_LABEL,
      slotToFeedKey: DEMO_SLOT_TO_KEY,
      formulas: {
        liquidateWhen:
          "price * collateralQty * 100 < debtLovelace * 110 (same units as on-chain Pyth price)",
        claimInsuranceWhen: "hedge active and price < strike_raw",
      },
    });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.get("/api/wallet", async (_req, res) => {
  try {
    const mnemonic = requireMnemonic();
    const client = createPreprodSigningClient(mnemonic);
    const addr = await client.address();
    const utxos = await client.getWalletUtxos();
    let lovelace = 0n;
    const nfts: { unit: string; quantity: string }[] = [];
    for (const u of utxos) {
      lovelace += u.assets.lovelace;
      const m = u.assets.multiAsset;
      if (!m) continue;
      for (const [pid, inner] of m.map) {
        const ph = PolicyId.toHex(pid);
        for (const [aname, qty] of inner) {
          if (qty > 0n) {
            nfts.push({
              unit: ph + AssetName.toHex(aname),
              quantity: qty.toString(),
            });
          }
        }
      }
    }
    let lucidAddress = "";
    let paymentKeyHashHex = "";
    let nativeNfts: WalletNativeNft[] = [];
    let shadowNfts: WalletShadowNft[] = [];
    let lucidError: string | undefined;
    try {
      const { shadows, native } = await listWalletShadowAndNative(mnemonic);
      lucidAddress = shadows.address;
      paymentKeyHashHex = native.paymentKeyHashHex;
      nativeNfts = native.nfts;
      shadowNfts = shadows.nfts;
    } catch (e) {
      lucidError =
        e instanceof Error ? e.message : String(e);
    }
    res.json({
      address: Address.toBech32(addr),
      lucidAddress: lucidAddress || undefined,
      /** Mismo criterio que datum `owner` del vault (Lucid payment key). */
      paymentKeyHashHex: paymentKeyHashHex || undefined,
      lovelace: lovelace.toString(),
      adaApprox: (Number(lovelace) / 1e6).toFixed(6),
      nftCount: nfts.length,
      nfts,
      nativeNfts,
      shadowNfts,
      ...(lucidError ? { lucidError } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/pyth/demo-feeds", async (_req, res) => {
  try {
    const slots: DemoSlot[] = ["metal", "oil", "stock"];
    const rows = [];
    for (const slot of slots) {
      const key = DEMO_SLOT_TO_KEY[slot] as ShadowAssetKey;
      const m = LAZER_FEED_BY_KEY[key];
      const chain = quoteChainForDemoSlot(slot);
      const quote = await fetchFeedQuoteResolved(chain);
      const marketOpen = Boolean(quote.priceRaw);
      rows.push({
        slot,
        key,
        feedId: m.id,
        proSymbol: m.proSymbol,
        uiTitle: m.uiTitle,
        lazerChannel: m.channel,
        label: DEMO_SLOT_LABEL[slot].title,
        quote,
        proSymbolUsed:
          quote.resolvedProSymbol ??
          (quote.priceRaw ? m.proSymbol : undefined),
        quoteNote: quote.quoteNote,
        marketOpen,
        marketLabel: marketOpen ? "Mercado abierto" : "Mercado cerrado",
      });
    }
    res.json({
      asOf: Date.now(),
      docsUrl:
        "https://docs.pyth.network/price-feeds/pro/price-feed-ids",
      rows,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/audit", (req, res) => {
  const lim = Number(req.query.limit ?? 100);
  const limit = Number.isFinite(lim)
    ? Math.min(400, Math.max(1, Math.floor(lim)))
    : 100;
  res.json({ events: readAudit(limit) });
});

/** Pool: totales desde script `liquidity_pool` + vaults (deuda y hedge en datum). */
app.get("/api/pool/state", async (_req, res) => {
  try {
    if (!process.env.CARDANO_MNEMONIC?.trim()) {
      res.json(emptyPoolState());
      return;
    }
    res.json(await getPoolStateFromChain());
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Depósito real al script `liquidity_pool` (estado del pool = lectura de cadena). */
app.post("/api/pool/onchain/deposit-percent", async (req, res) => {
  try {
    const pct = Number(req.body?.percent ?? 80);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100 || Math.floor(pct) !== pct) {
      res.status(400).json({ error: "percent debe ser entero entre 1 y 100" });
      return;
    }
    const total = await walletTotalLovelaceLucid();
    if (total <= 0n) {
      res.status(400).json({ error: "Wallet sin lovelace (Lucid)" });
      return;
    }
    const reserve = poolDepositReserveLovelace();
    if (total <= reserve) {
      res.status(400).json({
        error: `Saldo ${total} lovelace ≤ reserva fees ${reserve}. Necesitás más tADA o bajá POOL_DEPOSIT_RESERVE_LOVELACE en .env.`,
        walletLovelace: total.toString(),
        reserveLovelace: reserve.toString(),
      });
      return;
    }
    /** Plain pct of wallet (integer division). */
    const byPercent = (total * BigInt(pct)) / 100n;
    /** Max send while leaving `reserve` for tx fees (same rule as `depositLiquidityPoolOnChain`). */
    const maxAfterReserve = total - reserve;
    const amount =
      byPercent <= maxAfterReserve ? byPercent : maxAfterReserve;
    if (amount <= 0n) {
      res.status(400).json({
        error: `El ${pct}% redondea a 0.`,
        walletLovelace: total.toString(),
      });
      return;
    }
    const cappedToReserve = byPercent > maxAfterReserve;
    const txHash = await depositLiquidityPoolOnChain({ lovelace: amount });
    const p = await getPoolStateFromChain();
    appendAudit({
      kind: "pool_onchain_deposit_pct",
      summary: `Pool on-chain +${amount} lovelace (${pct}% wallet)`,
      txHash,
      extra: {
        percent: pct,
        walletLovelace: total.toString(),
        depositedLovelace: amount.toString(),
      },
    });
    res.json({
      txHash,
      pool: p,
      walletLovelace: total.toString(),
      depositedLovelace: amount.toString(),
      percent: pct,
      liquidityPoolAddressBech32: liquidityPoolAddressBech32(),
      ...(cappedToReserve
        ? {
            note: `Pediste ${pct}% (${byPercent} lovelace) pero solo cabe ${maxAfterReserve} sin tocar la reserva de fees (${reserve}). Se depositó ese máximo.`,
            requestedByPercentLovelace: byPercent.toString(),
            reserveLovelace: reserve.toString(),
          }
        : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/pool/onchain/deposit", async (req, res) => {
  try {
    const raw = req.body?.lovelace;
    if (raw == null) {
      res.status(400).json({ error: "lovelace required" });
      return;
    }
    const amount = BigInt(String(raw));
    if (amount <= 0n) {
      res.status(400).json({ error: "lovelace must be positive" });
      return;
    }
    const txHash = await depositLiquidityPoolOnChain({ lovelace: amount });
    const p = await getPoolStateFromChain();
    appendAudit({
      kind: "pool_onchain_deposit",
      summary: `Pool on-chain +${amount} lovelace`,
      txHash,
      extra: { depositedLovelace: amount.toString() },
    });
    res.json({
      txHash,
      pool: p,
      depositedLovelace: amount.toString(),
      liquidityPoolAddressBech32: liquidityPoolAddressBech32(),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/pool/onchain/positions", async (_req, res) => {
  try {
    const positions = await listPoolDepositsOnChain();
    const total = positions.reduce((a, r) => a + BigInt(r.lovelace), 0n);
    res.json({
      positions,
      totalLovelace: total.toString(),
      liquidityPoolAddressBech32: liquidityPoolAddressBech32(),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Gasta todos los UTxOs del pool con tu owner en datum. */
app.post("/api/pool/onchain/withdraw-all", async (_req, res) => {
  try {
    const { txHash, withdrawnLovelace, inputCount } =
      await withdrawAllLiquidityPoolOnChain();
    const p = await getPoolStateFromChain();
    appendAudit({
      kind: "pool_onchain_withdraw_all",
      summary: `Pool on-chain retiro ${withdrawnLovelace} lovelace (${inputCount} inputs)`,
      txHash,
      extra: { withdrawnLovelace, inputCount },
    });
    res.json({
      txHash,
      withdrawnLovelace,
      inputCount,
      pool: p,
      liquidityPoolAddressBech32: liquidityPoolAddressBech32(),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/mint", async (req, res) => {
  try {
    const slot = parseSlot(String(req.body?.slot ?? ""));
    const out = await mintShadowNftSubprocess(slot);
    appendAudit({
      kind: "mint_shadow",
      summary: `Mint NFT sombra (${out.slot}) · ${out.assetName}`,
      txHash: out.txHash,
      extra: { feedId: out.feedId, policyId: out.policyId },
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/vaults", async (_req, res) => {
  try {
    const rows = await listVaultPositions();
    res.json({
      vaults: rows.map((r) => ({
        ref: r.ref,
        txHash: r.txHash,
        outputIndex: r.outputIndex,
        lovelace: r.lovelace,
        datum: jsonDatum(r.datum),
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/vault/open", async (req, res) => {
  try {
    const {
      nftPolicyHex,
      nftNameHex,
      feedId,
      debtLovelace,
      collateralQty,
    } = req.body ?? {};
    if (!nftPolicyHex || !nftNameHex || feedId == null) {
      res.status(400).json({ error: "nftPolicyHex, nftNameHex, feedId required" });
      return;
    }
    const pol = String(nftPolicyHex);
    const nm = String(nftNameHex);
    const loan = BigInt(debtLovelace ?? "0");
    if (loan > 0n) {
      const st = await getPoolStateFromChain();
      if (st.outstandingLoans[nftLoanKey(pol, nm)]) {
        res.status(400).json({
          error:
            "Ya existe una vault con deuda on-chain para este NFT (cerrala o usá otro activo).",
          code: "VAULT_ALREADY_OWES",
        });
        return;
      }
      const av = BigInt(st.availableLovelace);
      if (av < loan) {
        res.status(400).json({
          error:
            `El pool no tiene tADA suficientes para financiar este préstamo. Disponible (cadena): ${av} lovelace; solicitado: ${loan}. Depositá tADA al contrato pool on-chain (pestaña Seguros).`,
          code: "POOL_INSUFFICIENT_FUNDS",
          availableLovelace: av.toString(),
          requestedLovelace: loan.toString(),
        });
        return;
      }
    }
    const txHash = await openVault({
      nftPolicyHex: pol,
      nftNameHex: nm,
      feedId: Number(feedId),
      debtLovelace: loan,
      collateralQty: BigInt(collateralQty ?? "1"),
    });
    appendAudit({
      kind: "vault_open",
      summary:
        loan > 0n
          ? `openVault: préstamo desde pool ${loan} lovelace · feed_id=${feedId}`
          : `openVault colateral-only (principal 0) · feed_id=${feedId}`,
      txHash,
      extra: {
        nftPolicyHex: pol,
        nftNameHex: nm,
        feedId: Number(feedId),
        loanLovelace: loan.toString(),
      },
    });
    res.json({ txHash });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/vault/hedge", async (req, res) => {
  try {
    const { txHash, outputIndex, strikeRaw, payoutLovelace } = req.body ?? {};
    if (txHash == null || outputIndex == null) {
      res.status(400).json({ error: "txHash and outputIndex required" });
      return;
    }
    const u = await getVaultUtxoByRef(String(txHash), Number(outputIndex));
    const decoded = decodeVaultDatum(readInlineDatum(u));
    const payoutReq = BigInt(payoutLovelace ?? "0");
    if (payoutReq > 0n) {
      const eff = await effectiveAvailableForHedgePayout(u);
      if (eff < payoutReq) {
        res.status(400).json({
          error:
            `El pool no puede respaldar este payout (${payoutReq} lovelace). Liquidez efectiva para esta cobertura: ${eff}. Aportá más tADA on-chain al pool o bajá el payout.`,
          code: "POOL_INSUFFICIENT_FUNDS",
          requestedLovelace: payoutReq.toString(),
          effectiveAvailableLovelace: eff.toString(),
        });
        return;
      }
    }
    const h = await applyHedge({
      vaultUtxo: u,
      strikeRaw: BigInt(strikeRaw ?? "0"),
      payoutLovelace: payoutReq,
    });
    appendAudit({
      kind: "vault_hedge",
      summary: `applyHedge strike=${strikeRaw} payout=${payoutLovelace}`,
      txHash: h,
      extra: {
        nftPolicyHex: decoded.nftPolicyHex,
        nftNameHex: decoded.nftNameHex,
      },
    });
    const nextRef = await findVaultRefByNftWithRetry(
      decoded.nftPolicyHex,
      decoded.nftNameHex,
    );
    if (nextRef) {
      appendAudit({
        kind: "vault_hedge_onchain",
        summary: `Cobertura en datum vault (cap ${payoutReq} lovelace) · ref ${nextRef}`,
        txHash: h,
        extra: {
          vaultRef: nextRef,
          payoutLovelace: payoutReq.toString(),
        },
      });
    } else {
      appendAudit({
        kind: "pool_reserve_hedge_skipped",
        summary:
          "No se encontró la vault tras hedge (indexador); reintentá o reservá tras refrescar.",
        txHash: h,
      });
    }
    res.json({ txHash: h, poolVaultRef: nextRef });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/vault/adjust", async (req, res) => {
  try {
    const { txHash, outputIndex, newDebtLovelace } = req.body ?? {};
    if (txHash == null || outputIndex == null || newDebtLovelace == null) {
      res
        .status(400)
        .json({ error: "txHash, outputIndex, newDebtLovelace required" });
      return;
    }
    const u = await getVaultUtxoByRef(String(txHash), Number(outputIndex));
    const prev = decodeVaultDatum(readInlineDatum(u));
    const oldD = prev.debtLovelace;
    const newD = BigInt(newDebtLovelace);
    if (newD > oldD) {
      const need = newD - oldD;
      const av = BigInt((await getPoolStateFromChain()).availableLovelace);
      if (av < need) {
        res.status(400).json({
          error:
            `El pool no tiene tADA para aumentar el préstamo en ${need} lovelace. Disponible: ${av}.`,
          code: "POOL_INSUFFICIENT_FUNDS",
          availableLovelace: av.toString(),
          requestedLovelace: need.toString(),
        });
        return;
      }
    }
    const h = await adjustDebt({
      vaultUtxo: u,
      newDebtLovelace: newD,
    });
    appendAudit({
      kind: "vault_adjust",
      summary: `adjustDebt on-chain ${oldD.toString()} → ${newD.toString()} (referencia demo: ${LOAN_REPAY_INTEREST_BPS} bps no mueve tADA en este MVP)`,
      txHash: h,
    });
    res.json({ txHash: h });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/vault/close", async (req, res) => {
  try {
    const { txHash, outputIndex } = req.body ?? {};
    if (txHash == null || outputIndex == null) {
      res.status(400).json({ error: "txHash and outputIndex required" });
      return;
    }
    const u = await getVaultUtxoByRef(String(txHash), Number(outputIndex));
    const decoded = decodeVaultDatum(readInlineDatum(u));
    const h = await closeVault({ vaultUtxo: u });
    appendAudit({
      kind: "vault_close",
      summary: "closeVault (debt=0)",
      txHash: h,
      extra: {
        nftPolicyHex: decoded.nftPolicyHex,
        nftNameHex: decoded.nftNameHex,
      },
    });
    res.json({ txHash: h });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/vault/liquidate", async (req, res) => {
  try {
    const { txHash, outputIndex, priceFeedId } = req.body ?? {};
    if (txHash == null || outputIndex == null || priceFeedId == null) {
      res
        .status(400)
        .json({ error: "txHash, outputIndex, priceFeedId required" });
      return;
    }
    const u = await getVaultUtxoByRef(String(txHash), Number(outputIndex));
    const decoded = decodeVaultDatum(readInlineDatum(u));
    const h = await liquidate({
      vaultUtxo: u,
      priceFeedId: Number(priceFeedId),
    });
    appendAudit({
      kind: "vault_liquidate",
      summary: `liquidate on-chain · deuda ${decoded.debtLovelace.toString()} · feed ${priceFeedId}`,
      txHash: h,
      extra: {
        nftPolicyHex: decoded.nftPolicyHex,
        nftNameHex: decoded.nftNameHex,
      },
    });
    res.json({ txHash: h });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/vault/claim", async (req, res) => {
  try {
    const { txHash, outputIndex, priceFeedId } = req.body ?? {};
    if (txHash == null || outputIndex == null || priceFeedId == null) {
      res
        .status(400)
        .json({ error: "txHash, outputIndex, priceFeedId required" });
      return;
    }
    const u = await getVaultUtxoByRef(String(txHash), Number(outputIndex));
    const decoded = decodeVaultDatum(readInlineDatum(u));
    const h = await claimInsurance({
      vaultUtxo: u,
      priceFeedId: Number(priceFeedId),
    });
    appendAudit({
      kind: "vault_claim",
      summary: `claimInsurance on-chain (payout según outputs de la tx)`,
      txHash: h,
      extra: {
        nftPolicyHex: decoded.nftPolicyHex,
        nftNameHex: decoded.nftNameHex,
      },
    });
    res.json({ txHash: h });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/pyth/quotes", async (req, res) => {
  try {
    const raw = String(req.query.ids ?? "");
    const ids = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => Number(x));
    const quotes = await fetchFeedQuotes(ids);
    res.json({ quotes });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/**
 * `collateral_qty` mínimo y sugerido (con 25% colchón) alineados a `vault.ak` Liquidate:
 * `priceRaw * qty * 100 >= debtLovelace * 110`.
 */
app.get("/api/pyth/collateral-hint", async (req, res) => {
  try {
    const feedId = Number(req.query.feedId ?? "");
    const debtLovelace = BigInt(String(req.query.debtLovelace ?? "0"));
    if (!Number.isFinite(feedId) || feedId <= 0) {
      res.status(400).json({ error: "feedId query required (positive number)" });
      return;
    }
    const chain = quoteChainForVaultFeedId(feedId);
    const q = await fetchFeedQuoteResolved(chain);
    if (!q.priceRaw) {
      res.json({
        quote: q,
        minCollateralQty: null,
        suggestedCollateralQty: null,
        note:
          q.quoteNote ??
          "Sin precio Pyth en esta cadena — no se puede derivar colateral.",
      });
      return;
    }
    const priceRaw = BigInt(q.priceRaw);
    const minCollateralQty = minCollateralQtyForDebt(
      debtLovelace,
      priceRaw,
    ).toString();
    const suggestedCollateralQty = suggestedCollateralQtyForDebt(
      debtLovelace,
      priceRaw,
    ).toString();
    res.json({
      quote: q,
      minCollateralQty,
      suggestedCollateralQty,
      debtLovelace: debtLovelace.toString(),
      formula:
        "Liquidación si price×qty×100 < debt×110. min qty = ceil(debt×110/(price×100)); sugerido = min + 25% buffer.",
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/risk", async (req, res) => {
  try {
    const txHash = String(req.query.txHash ?? "");
    const outputIndex = Number(req.query.outputIndex ?? "");
    if (!txHash || Number.isNaN(outputIndex)) {
      res.status(400).json({ error: "txHash and outputIndex query required" });
      return;
    }
    const u = await getVaultUtxoByRef(txHash, outputIndex);
    const datum = decodeVaultDatum(readInlineDatum(u));
    const feedId = Number(datum.feedId);
    const chain = quoteChainForVaultFeedId(feedId);
    const q = await fetchFeedQuoteResolved(chain);
    let underwater = false;
    let claimEligible = false;
    let note = q.quoteNote ?? "";
    if (q.priceRaw) {
      const priceRaw = BigInt(q.priceRaw);
      underwater = isUnderwater({
        priceRaw,
        collateralQty: datum.collateralQty,
        debtLovelace: datum.debtLovelace,
      });
      if (datum.hedge.tag === "some") {
        claimEligible = priceRaw < datum.hedge.strikeRaw;
      }
      if (q.priceFeedId !== feedId) {
        note =
          (note ? `${note} ` : "") +
          `Precio mostrado es del feed ${q.priceFeedId} (${q.resolvedProSymbol ?? "?"}); el datum usa feed_id ${feedId} — on-chain el testigo Pyth debe coincidir con ese id para liquidar.`;
      }
    } else if (!note) {
      note =
        "Mercado cerrado o sin publicadores en esta cadena de feeds — no es un error de la aplicación.";
    }
    const marketOpen = Boolean(q.priceRaw);
    const loanPoolNote =
      `On-chain: el validador compara precio×colateral vs principal en datum. ` +
      `La deuda solo cambia con txs (Adjust/Close/Liquidate/Claim). Referencia demo: ${LOAN_REPAY_INTEREST_BPS} bps no mueve tADA en este MVP.`;
    res.json({
      ref: `${txHash}#${outputIndex}`,
      feedId,
      quote: q,
      underwater,
      claimEligible,
      debtLovelace: datum.debtLovelace.toString(),
      collateralQty: datum.collateralQty.toString(),
      hedge: jsonDatum(datum).hedge,
      note,
      loanPoolNote,
      marketOpen,
      marketLabel: marketOpen ? "Mercado abierto" : "Mercado cerrado",
      marketHint: marketOpen
        ? undefined
        : "Sin precio en este momento. Suele deberse a mercado cerrado o a la ausencia temporal de publicadores.",
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  },
);

app.listen(PORT, () => {
  console.log(`Judge API http://127.0.0.1:${PORT}`);
});
