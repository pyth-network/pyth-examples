"use client";

import { useState } from "react";
import { useWallet } from "@meshsdk/react";
import { UTxO } from "@meshsdk/core";
import { withdraw } from "@/lib/transactions";
import { fetchSignedUpdate } from "@/lib/pyth";

interface Props {
  vaultUtxo: UTxO;
  datum: { alternative: number; fields: unknown[] };
  goalMet: boolean;
  onWithdrawn: () => void;
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

  return "Withdraw failed. Check Pyth config and try again.";
}

export default function WithdrawPanel({ vaultUtxo, datum, goalMet, onWithdrawn }: Props) {
  const { wallet } = useWallet();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [txHash, setTxHash] = useState("");
  const [errMsg, setErrMsg] = useState("");

  async function handleWithdraw() {
    if (!wallet) return;
    setStatus("loading");
    setErrMsg("");
    try {
      const signedUpdate = await fetchSignedUpdate();
      const hash = await withdraw(wallet, vaultUtxo, datum, signedUpdate);
      setTxHash(hash);
      setStatus("ok");
      onWithdrawn();
    } catch (e: unknown) {
      console.error("withdraw error:", e);
      setErrMsg(extractErrorMessage(e));
      setStatus("err");
    }
  }

  if (!goalMet) {
    return (
      <div className="rounded-lg bg-cream border border-clay-pale px-4 py-3 text-sm text-bark-light text-center">
        Your vault unlocks once its value reaches your goal.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-sage-pale border border-sage/20 px-4 py-3 text-sm text-sage font-semibold text-center">
        🎉 Goal reached — you can withdraw.
      </div>

      {status === "err" && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errMsg}</p>
      )}
      {status === "ok" && (
        <div className="bg-sage-pale rounded-lg px-3 py-2 text-sage text-sm">
          ✓ Withdrawal complete —{" "}
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
        onClick={handleWithdraw}
        disabled={status === "loading"}
        className="w-full bg-sage hover:bg-sage/80 disabled:opacity-60 transition-colors text-white font-semibold rounded-lg py-2.5 text-sm"
      >
        {status === "loading" ? "Processing…" : "Withdraw all"}
      </button>
    </div>
  );
}
