import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "./components/TopBar";
import { OpenCdpForm } from "./components/OpenCdpForm";
import { AllCdpsTable } from "./components/AllCdpsTable";
import { ActionModal } from "./components/ActionModal";
import { useCdps } from "./hooks/useCdps";
import { usePrice } from "./hooks/usePrice";
import { useWallet } from "./hooks/useWallet";
import { api } from "./api/client";
import type { CdpInfo } from "./api/types";

type CdpAction = "borrow" | "repay" | "close" | "liquidate";

function lovelaceToAda(l: number): string {
  return (l / 1_000_000).toFixed(2);
}

function pusdToDisplay(p: number): string {
  return (p / 1_000_000).toFixed(2);
}

export default function App() {
  const { data: cdps } = useCdps();
  const { data: price } = usePrice();
  const wallet = useWallet();
  const qc = useQueryClient();

  const [activeCdp, setActiveCdp] = useState<CdpInfo | null>(null);
  const [activeAction, setActiveAction] = useState<CdpAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    const wallets = window.cardano ? Object.keys(window.cardano) : [];
    const name = wallets.find((w) => w !== "ccvault") ?? wallets[0];
    if (!name) {
      alert("No CIP-30 wallet found. Install Nami, Eternl, or Lace.");
      return;
    }
    await wallet.connect(name);
  }, [wallet]);

  const signAndSubmit = useCallback(
    async (txHex: string) => {
      if (!wallet.walletApi) throw new Error("Wallet not connected");
      console.log("[signAndSubmit] Signing tx, CBOR hex length:", txHex.length);
      // CIP-30 signTx returns a TransactionWitnessSet CBOR, not the full signed tx
      const witnessSetHex = await wallet.walletApi.signTx(txHex, true);
      console.log("[signAndSubmit] Got witness set, length:", witnessSetHex?.length, "type:", typeof witnessSetHex);
      console.log("[signAndSubmit] Witness set hex (first 80):", witnessSetHex?.substring(0, 80));
      // Send both to backend for merging + submission via Blockfrost
      const result = await api.submitTx({
        txCborHex: txHex,
        witnessCborHex: witnessSetHex,
      });
      console.log("[signAndSubmit] Submitted! txHash:", result.txHash);
      return result.txHash;
    },
    [wallet.walletApi],
  );

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["cdps"] });
    wallet.refreshBalance();
  }, [qc, wallet]);

  const handleAction = useCallback(
    (cdp: CdpInfo, action: CdpAction) => {
      if (!wallet.address) {
        alert("Connect your wallet first.");
        return;
      }
      setActiveCdp(cdp);
      setActiveAction(action);
      setActionError(null);
    },
    [wallet.address],
  );

  const handleConfirm = useCallback(
    async (amount?: number) => {
      if (!activeCdp || !activeAction || !wallet.address) return;
      setActionLoading(true);
      setActionError(null);
      try {
        let resp;
        switch (activeAction) {
          case "close":
            resp = await api.close({
              nftName: activeCdp.nftName,
              ownerAddress: wallet.address,
            });
            break;
          case "borrow":
            if (!amount || amount <= 0) throw new Error("Enter a valid amount");
            resp = await api.borrow({
              nftName: activeCdp.nftName,
              amount: amount,
              ownerAddress: wallet.address,
            });
            break;
          case "repay":
            if (!amount || amount <= 0) throw new Error("Enter a valid amount");
            resp = await api.repay({
              nftName: activeCdp.nftName,
              amount: amount,
              ownerAddress: wallet.address,
            });
            break;
          case "liquidate":
            resp = await api.liquidate({
              nftName: activeCdp.nftName,
              liquidatorAddress: wallet.address,
            });
            break;
        }
        const txHash = await signAndSubmit(resp.txCborHex);
        console.log(`[${activeAction}] Submitted! txHash:`, txHash);
        setActiveCdp(null);
        setActiveAction(null);
        refresh();
      } catch (err) {
        console.error(`[${activeAction}] Error:`, err);
        setActionError(err instanceof Error ? err.message : "Failed");
      } finally {
        setActionLoading(false);
      }
    },
    [activeCdp, activeAction, wallet.address, signAndSubmit, refresh],
  );

  const handleCancel = useCallback(() => {
    setActiveCdp(null);
    setActiveAction(null);
    setActionError(null);
  }, []);

  const modalProps = activeCdp && activeAction ? getModalProps(activeAction, activeCdp) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        connected={wallet.connected}
        address={wallet.address}
        balanceLovelace={wallet.balanceLovelace}
        balancePusd={wallet.balancePusd}
        onConnect={handleConnect}
        onDisconnect={wallet.disconnect}
      />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        <p className="text-lg text-gray-300">
          PUSD is a synthetic stablecoin on Cardano, backed by ADA collateral and priced via the{" "}
          <a href="https://pyth.network" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
            Pyth Network
          </a>{" "}
          oracle.
        </p>
        {wallet.connected && wallet.address && (
          <OpenCdpForm
            address={wallet.address}
            adaUsd={price?.adaUsd ?? null}
            balanceLovelace={wallet.balanceLovelace}
            onSuccess={refresh}
            signAndSubmit={signAndSubmit}
          />
        )}
        <div>
          <h2 className="font-semibold text-lg mb-4">All CDPs</h2>
          <AllCdpsTable
            cdps={cdps ?? []}
            adaUsd={price?.adaUsd ?? null}
            ownerAddress={wallet.address}
            onAction={handleAction}
          />
        </div>

        <details className="rounded-lg border border-pyth-border bg-pyth-bg2 p-5 group">
          <summary className="font-semibold text-lg cursor-pointer list-none flex items-center gap-2">
            <span className="text-gray-500 text-sm transition-transform group-open:rotate-90">&#9654;</span>
            How it works
          </summary>
          <ul className="text-sm text-gray-300 space-y-1.5 list-disc list-inside mt-3">
            <li><strong>Open a CDP</strong> &mdash; lock ADA as collateral and mint PUSD. Max loan-to-value: <strong>95%</strong>.</li>
            <li><strong>Borrow more</strong> &mdash; mint additional PUSD against your collateral (owner only, must stay under 95% LTV).</li>
            <li><strong>Repay</strong> &mdash; burn PUSD to reduce your debt (owner only).</li>
            <li><strong>Close</strong> &mdash; burn all PUSD debt + the CDP NFT, get your ADA back (owner only).</li>
            <li><strong>Liquidate</strong> &mdash; anyone can liquidate a CDP whose LTV exceeds <strong>90%</strong>. The liquidator provides PUSD to cover the debt and receives the ADA collateral.</li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            All rules are enforced on-chain by a Plutus V3 smart contract. Each CDP is identified by a unique NFT.
          </p>
        </details>
      </main>
      <footer className="flex items-center justify-center gap-4 text-xs text-gray-600 py-4 border-t border-pyth-border">
        <span>Pythacoin &mdash; CDP Stablecoin powered by Pyth Network</span>
        <span className="text-gray-700">|</span>
        <a href="https://scalus.org" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-gray-400 transition-colors">
          Built with Scalus <img src="https://scalus.org/scalus-logo-dark.png" alt="Scalus" className="h-4 inline" />
        </a>
      </footer>

      {modalProps && (
        <ActionModal
          {...modalProps}
          loading={actionLoading}
          error={actionError}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

function getModalProps(action: CdpAction, cdp: CdpInfo) {
  const ada = lovelaceToAda(cdp.collateralLovelace);
  const pusd = pusdToDisplay(cdp.debtPusd);
  switch (action) {
    case "close":
      return {
        title: "Close CDP",
        description: `Burn ${pusd} PUSD debt and return ${ada} ADA collateral.`,
        confirmLabel: "Close CDP",
        confirmColor: "red" as const,
      };
    case "borrow":
      return {
        title: "Borrow PUSD",
        description: `Current debt: ${pusd} PUSD. Collateral: ${ada} ADA.`,
        amountLabel: "Additional PUSD to borrow",
        confirmLabel: "Borrow",
        confirmColor: "purple" as const,
      };
    case "repay":
      return {
        title: "Repay PUSD",
        description: `Current debt: ${pusd} PUSD. Collateral: ${ada} ADA.`,
        amountLabel: "PUSD to repay",
        confirmLabel: "Repay",
        confirmColor: "green" as const,
      };
    case "liquidate":
      return {
        title: "Liquidate CDP",
        description: `Liquidate this under-collateralized CDP (${ada} ADA / ${pusd} PUSD).`,
        confirmLabel: "Liquidate",
        confirmColor: "red" as const,
      };
  }
}
