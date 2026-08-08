"use client";

import { useState } from "react";
import { useWallet } from "@meshsdk/react";
import { UTxO } from "@meshsdk/core";
import { deposit } from "@/lib/transactions";
import { LOVELACE_PER_ADA } from "@/lib/contract";

interface Props {
  vaultUtxo: UTxO;
  datum: { alternative: number; fields: unknown[] };
  adaPrice: number;
  onDeposited: () => void;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const maybe = error as {
      message?: unknown;
      info?: unknown;
      data?: { message?: unknown; error?: unknown };
      status?: unknown;
    };
    if (typeof maybe.message === "string" && maybe.message.trim()) return maybe.message;
    if (typeof maybe.info === "string" && maybe.info.trim()) return maybe.info;
    if (typeof maybe.data?.message === "string" && maybe.data.message.trim()) return maybe.data.message;
    if (typeof maybe.data?.error === "string" && maybe.data.error.trim()) return maybe.data.error;
    if (typeof maybe.status === "number") return `Request failed with status ${maybe.status}.`;
  }

  return "Deposit failed. Please try again and check wallet confirmation.";
}

export default function DepositPanel({ vaultUtxo, datum, adaPrice, onDeposited }: Props) {
  const { wallet } = useWallet();
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<"ada" | "usd">("ada");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [txHash, setTxHash] = useState("");
  const [errMsg, setErrMsg] = useState("");

  async function handleDeposit() {
    if (!wallet) return;
    const enteredAmount = parseFloat(amount);
    if (!enteredAmount || enteredAmount <= 0) {
      setStatus("err");
      setErrMsg("Enter a valid amount.");
      return;
    }

    if (unit === "usd" && adaPrice <= 0) {
      setStatus("err");
      setErrMsg("ADA/USD price is not available yet. Please try again in a moment.");
      return;
    }

    const ada = unit === "ada" ? enteredAmount : enteredAmount / adaPrice;
    setStatus("loading");
    setErrMsg("");
    try {
      const lovelace = Math.floor(ada * LOVELACE_PER_ADA);
      const hash = await deposit(wallet, vaultUtxo, datum, lovelace, 0);
      if (!hash) {
        throw new Error("Transaction was built but no tx hash was returned by wallet.");
      }
      setTxHash(hash);
      setStatus("ok");
      onDeposited();
    } catch (e: unknown) {
      console.error("deposit error:", e);
      setErrMsg(extractErrorMessage(e));
      setStatus("err");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-bark-light uppercase tracking-widest mb-1">
          Amount to add
        </label>
        <div className="mb-2 flex w-full rounded-lg bg-cream p-1 gap-1">
          <button
            type="button"
            onClick={() => setUnit("ada")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              unit === "ada" ? "bg-white text-bark shadow-sm" : "text-bark-light hover:text-bark"
            }`}
          >
            ADA
          </button>
          <button
            type="button"
            onClick={() => setUnit("usd")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              unit === "usd" ? "bg-white text-bark shadow-sm" : "text-bark-light hover:text-bark"
            }`}
          >
            USD
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-light">
            {unit === "ada" ? "₳" : "$"}
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder={unit === "ada" ? "5" : "1"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-cream border border-clay-pale rounded-lg pl-7 pr-4 py-2.5 text-bark font-body focus:outline-none focus:ring-2 focus:ring-clay"
          />
        </div>
        <p className="mt-1 text-xs text-bark-light/70">
          {unit === "ada"
            ? (adaPrice > 0 && amount
              ? `≈ $${(parseFloat(amount || "0") * adaPrice).toFixed(2)}`
              : "Add ADA directly to your vault.")
            : (adaPrice > 0 && amount
              ? `≈ ₳ ${(parseFloat(amount || "0") / adaPrice).toFixed(2)}`
              : "USD amount converts to ADA with Pyth price.")}
        </p>
      </div>

      {status === "err" && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errMsg}</p>
      )}
      {status === "ok" && (
        <div className="bg-sage-pale rounded-lg px-3 py-2 text-sage text-sm">
          ✓ Deposit confirmed —{" "}
          <a
            href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            view tx
          </a>
        </div>
      )}

      <button
        onClick={handleDeposit}
        disabled={status === "loading"}
        className="w-full bg-clay hover:bg-clay-light disabled:opacity-60 transition-colors text-white font-semibold rounded-lg py-2.5 text-sm"
      >
        {status === "loading" ? "Sending…" : "Add ADA"}
      </button>
    </div>
  );
}
