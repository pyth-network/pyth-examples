"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@meshsdk/react";
import {
  UTxO,
  BlockfrostProvider,
  deserializeAddress,
  deserializeDatum,
} from "@meshsdk/core";
import { getProvider } from "@/lib/provider";
import {
  SCRIPT_ADDRESS,
  MICRO_USD_PER_USD,
  LOVELACE_PER_ADA,
} from "@/lib/contract";
import { fetchAdaUsdPriceFromPyth } from "@/lib/pyth";
import PiggyIcon from "./PiggyIcon";
import WalletConnect from "./WalletConnect";
import CreateVaultPanel from "./CreateVaultPanel";
import DepositPanel from "./DepositPanel";
import WithdrawPanel from "./WithdrawPanel";

// ---------------------------------------------------------------------------
// Datum helpers
// ---------------------------------------------------------------------------

interface ParsedVaultDatum {
  goalMicroUsd: number;
  ownerVkh: string;
  pythPolicyId: string;
  feedId: number;
}

function tryParseDatum(
  plutusData: string,
): { mesh: { alternative: number; fields: unknown[] }; parsed: ParsedVaultDatum } | null {
  try {
    const d = deserializeDatum<{
      constructor: number;
      fields: { int?: number; bytes?: string }[];
    }>(plutusData);

    if (d.constructor !== 0 || d.fields.length < 4) return null;

    const goalMicroUsd = d.fields[0].int ?? 0;
    const ownerVkh = d.fields[1].bytes ?? "";
    const pythPolicyId = d.fields[2].bytes ?? "";
    const feedId = d.fields[3].int ?? 0;

    return {
      mesh: {
        alternative: 0,
        fields: [goalMicroUsd, ownerVkh, pythPolicyId, feedId],
      },
      parsed: { goalMicroUsd, ownerVkh, pythPolicyId, feedId },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ADA/USD price
// ---------------------------------------------------------------------------

async function fetchAdaPrice(): Promise<number> {
  try {
    return await fetchAdaUsdPriceFromPyth();
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const met = pct >= 100;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-bark-light mb-1.5">
        <span>${value.toFixed(2)}</span>
        <span>${max.toFixed(2)} goal</span>
      </div>
      <div className="h-2 bg-clay-pale rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${met ? "bg-sage" : "bg-clay"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-bark-light mt-1 text-right">{pct.toFixed(1)}%</p>
    </div>
  );
}

function getUtxoLovelace(utxo: UTxO): number {
  return parseInt(
    utxo.output.amount.find((amount) => amount.unit === "lovelace")?.quantity ?? "0",
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VaultDashboard() {
  const { connected, wallet } = useWallet();

  const [walletAda, setWalletAda] = useState<number | null>(null);
  const [vaultUtxo, setVaultUtxo] = useState<UTxO | null>(null);
  const [datum, setDatum] = useState<{ alternative: number; fields: unknown[] } | null>(null);
  const [parsedDatum, setParsedDatum] = useState<ParsedVaultDatum | null>(null);
  const [adaPrice, setAdaPrice] = useState<number>(0);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [loading, setLoading] = useState(false);

  // Fetch ADA price on mount and every 60 s
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const p = await fetchAdaPrice();
      if (!cancelled && p > 0) setAdaPrice(p);
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const fetchState = useCallback(async () => {
    if (!wallet || !connected) return;
    setLoading(true);
    try {
      const lovelaces = await wallet.getLovelace();
      setWalletAda(parseInt(lovelaces) / LOVELACE_PER_ADA);

      const addresses = await wallet.getUsedAddresses();
      const ownerAddr = addresses[0];
      const { pubKeyHash: ownerVkh } = deserializeAddress(ownerAddr);

      const provider = getProvider() as BlockfrostProvider;
      const scriptUtxos = await provider.fetchAddressUTxOs(SCRIPT_ADDRESS);

      let foundUtxo: UTxO | null = null;
      let foundDatum: { alternative: number; fields: unknown[] } | null = null;
      let foundParsed: ParsedVaultDatum | null = null;

      for (const u of scriptUtxos) {
        if (!u.output.plutusData) continue;
        const result = tryParseDatum(u.output.plutusData);
        if (result && result.parsed.ownerVkh === ownerVkh) {
          if (!foundUtxo || getUtxoLovelace(u) > getUtxoLovelace(foundUtxo)) {
            foundUtxo = u;
            foundDatum = result.mesh;
            foundParsed = result.parsed;
          }
        }
      }

      setVaultUtxo(foundUtxo);
      setDatum(foundDatum);
      setParsedDatum(foundParsed);
    } catch (err) {
      console.error("fetchState error:", err);
    } finally {
      setLoading(false);
    }
  }, [wallet, connected]);

  const triggerRefreshBurst = useCallback(() => {
    fetchState();
    const retryDelaysMs = [2_000, 5_000, 10_000];
    for (const delayMs of retryDelaysMs) {
      setTimeout(() => {
        fetchState();
      }, delayMs);
    }
  }, [fetchState]);

  const handleVaultCreated = useCallback(() => {
    triggerRefreshBurst();
  }, [triggerRefreshBurst]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // ---------- Not connected ----------
  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-7 pt-1 pb-14 text-center sm:gap-8">
        <p className="text-[0.6rem] text-bark-light/40 tracking-[0.28em] uppercase font-semibold animate-fade-in">
          Cardano · Pyth · Aiken
        </p>

        <div className="w-full max-w-[22rem] space-y-4 px-1 sm:max-w-xl">
          <h1 className="font-display font-semibold tracking-tight text-bark">
            <span className="block text-[2.65rem] leading-[1.02] min-[400px]:text-5xl sm:text-6xl sm:leading-[0.98] animate-slide-up-d1">
              Save with rules.
            </span>
            <span className="mt-2 block text-[2.65rem] leading-[1.02] min-[400px]:text-5xl sm:text-6xl sm:leading-[0.98] text-clay animate-slide-up-d2">
              No exceptions.
            </span>
          </h1>
          <p className="text-center text-sm leading-relaxed text-bark-light/75 max-w-[26rem] mx-auto sm:text-base animate-fade-in-d2">
            A Cardano vault on preprod: your ADA stays locked until the vault hits your USD
            target — priced by Pyth, enforced by the contract.
          </p>
        </div>

        <div className="animate-float drop-shadow-md opacity-95">
          <PiggyIcon className="h-28 w-28 sm:h-32 sm:w-32" />
        </div>

        <div className="flex w-full max-w-[20rem] flex-col items-stretch gap-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-bark-light/55 animate-fade-in-d3">
            Connect to start
          </p>
          <WalletConnect primaryCTA />
          <p className="text-[0.65rem] text-bark-light/40 leading-snug animate-fade-in-d3">
            Non-custodial · On-chain rules · You can also connect from the top bar
          </p>
        </div>
      </div>
    );
  }

  // ---------- Computed vault values ----------
  const vaultLovelace = vaultUtxo
    ? parseInt(
        vaultUtxo.output.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0",
      )
    : 0;
  const vaultAda = vaultLovelace / LOVELACE_PER_ADA;
  const vaultUsd = adaPrice > 0 ? vaultAda * adaPrice : 0;
  const walletUsd = walletAda !== null && adaPrice > 0 ? walletAda * adaPrice : null;
  const goalUsd = parsedDatum ? parsedDatum.goalMicroUsd / MICRO_USD_PER_USD : 0;
  const goalMet = goalUsd > 0 && vaultUsd >= goalUsd;

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Wallet balance bar */}
      <div className="flex items-center justify-between bg-warm border border-clay-pale rounded-2xl px-5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-bark-light uppercase tracking-widest">Wallet balance</p>
          <div className="mt-0.5 flex items-end gap-2">
            <p className="font-display text-2xl text-bark">
              ${walletUsd !== null ? walletUsd.toFixed(2) : "…"}
            </p>
            <p className="text-sm text-bark-light/70">
              {walletAda !== null ? `≈ ₳ ${walletAda.toFixed(2)}` : "…"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchState}
          disabled={loading}
          className="text-xs text-bark-light border border-clay-pale rounded-lg px-3 py-1.5 hover:bg-clay-pale transition-colors disabled:opacity-50"
        >
          {loading ? "…" : "↺ Refresh"}
        </button>
      </div>

      {/* No vault */}
      {!vaultUtxo && !loading && (
        <CreateVaultPanel onCreated={handleVaultCreated} />
      )}

      {/* Vault found */}
      {vaultUtxo && parsedDatum && (
        <div className="bg-warm border border-clay-pale rounded-2xl p-6 shadow-sm space-y-5 animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-4">
            <PiggyIcon className={`w-14 h-14 ${goalMet ? "animate-wobble" : "animate-pulse-soft"}`} />
            <div className="flex-1">
              <h2 className="font-display text-xl text-bark leading-tight">Your Iron Pig</h2>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                goalMet ? "bg-sage-pale text-sage" : "bg-clay-pale text-clay"
              }`}
            >
              {goalMet ? "Unlocked" : "Locked"}
            </span>
          </div>

          {/* Vault stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cream rounded-xl px-4 py-3">
              <p className="text-[0.65rem] font-semibold text-bark-light/60 uppercase tracking-widest">Vault</p>
              <div className="mt-0.5 flex items-end gap-2">
                <p className="font-display text-2xl text-bark">
                  {adaPrice > 0 ? `$${vaultUsd.toFixed(2)}` : "…"}
                </p>
                <p className="text-sm text-bark-light/70">≈ ₳ {vaultAda.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-cream rounded-xl px-4 py-3">
              <p className="text-[0.65rem] font-semibold text-bark-light/60 uppercase tracking-widest">Goal</p>
              <div className="mt-0.5 flex items-end gap-2">
                <p className="font-display text-2xl text-bark">${goalUsd.toFixed(2)}</p>
                <p className="text-sm text-bark-light/70">
                  {adaPrice > 0 ? `≈ ₳ ${(goalUsd / adaPrice).toFixed(0)}` : "…"}
                </p>
              </div>
            </div>
          </div>

          {/* ADA price ticker */}
          <div className="flex items-center justify-center gap-2 text-xs text-bark-light/60">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage animate-pulse-soft" />
            ADA/USD: {adaPrice > 0 ? `$${adaPrice.toFixed(4)}` : "loading…"}
          </div>

          {/* Progress */}
          {goalUsd > 0 && <ProgressBar value={vaultUsd} max={goalUsd} />}

          {/* Tabs */}
          <div className="flex bg-cream rounded-lg p-1 gap-1">
            {(["deposit", "withdraw"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-sm font-semibold py-2 rounded-md transition-colors ${
                  tab === t
                    ? "bg-white text-bark shadow-sm"
                    : "text-bark-light hover:text-bark"
                }`}
              >
                {t === "deposit" ? "Deposit" : "Withdraw"}
              </button>
            ))}
          </div>

          {tab === "deposit" && datum && (
            <DepositPanel
              vaultUtxo={vaultUtxo}
              datum={datum}
              adaPrice={adaPrice}
              onDeposited={triggerRefreshBurst}
            />
          )}
          {tab === "withdraw" && datum && (
            <WithdrawPanel
              vaultUtxo={vaultUtxo}
              datum={datum}
              goalMet={goalMet}
              onWithdrawn={triggerRefreshBurst}
            />
          )}
        </div>
      )}
    </div>
  );
}
