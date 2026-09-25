"use client";

import { useEffect } from "react";
import { usePipelineStore } from "@/store/usePipelineStore";
import CopyButton from "@/components/shared/CopyButton";
import { RefreshCw } from "lucide-react";

function truncateMiddle(s: string, chars = 8): string {
  if (s.length <= chars * 2 + 3) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function formatAda(lovelace: string): string {
  const ada = Number(BigInt(lovelace)) / 1_000_000;
  return `₳ ${ada.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

export default function WalletPanel() {
  const walletInfo = usePipelineStore((s) => s.walletInfo);
  const burnerAddress = usePipelineStore((s) => s.burnerAddress);
  const initBurnerWallet = usePipelineStore((s) => s.initBurnerWallet);
  const regenerateWallet = usePipelineStore((s) => s.regenerateWallet);
  const fetchWalletInfo = usePipelineStore((s) => s.fetchWalletInfo);

  useEffect(() => {
    initBurnerWallet();
  }, [initBurnerWallet]);

  useEffect(() => {
    if (burnerAddress) fetchWalletInfo();
  }, [burnerAddress, fetchWalletInfo]);

  return (
    <div className="space-y-2 border-t pt-3" style={{ borderColor: "var(--border-default)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Burner Wallet
        </h2>
        <button
          onClick={regenerateWallet}
          className="text-muted hover:text-foreground transition-colors"
          title="Generate new burner wallet"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: burnerAddress
              ? "var(--accent-green)"
              : "var(--accent-amber)",
          }}
        />
        <span className="text-sm font-medium text-foreground">
          {walletInfo?.network ?? "Testnet"}
        </span>
      </div>

      {burnerAddress ? (
        <div className="space-y-1.5 text-[11px]">
          {walletInfo?.balanceLovelace != null && (
            <div>
              <span className="text-muted">BALANCE</span>
              <div className="font-mono text-sm font-semibold text-accent-green">
                {formatAda(walletInfo.balanceLovelace)}
              </div>
            </div>
          )}
          <div>
            <span className="text-muted">ADDRESS</span>
            <div className="flex items-center font-mono text-secondary">
              {truncateMiddle(burnerAddress)}
              <CopyButton text={burnerAddress} />
            </div>
          </div>
          {walletInfo?.scriptAddress && (
            <div>
              <span className="text-muted">SCRIPT</span>
              <div className="flex items-center font-mono text-secondary">
                {truncateMiddle(walletInfo.scriptAddress)}
                <CopyButton text={walletInfo.scriptAddress} />
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted italic leading-relaxed pt-1">
            Stored in localStorage. Fund via testnet faucet.
          </p>
        </div>
      ) : (
        <div className="text-xs text-muted italic">Generating wallet…</div>
      )}
    </div>
  );
}
