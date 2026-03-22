import { useState, useEffect } from "react";
import PriceDisplay from "./components/PriceDisplay";
import Subscribe from "./components/Subscribe";
import Policies from "./components/Policies";
import Pool from "./components/Pool";
import WalletConnect from "./components/WalletConnect";
import Hint from "./components/Hint";
import {
  initPool,
  depositToPool,
  subscribe as chainSubscribe,
  fetchPoolStats,
  fetchPolicies,
  findPoolUtxo,
  getPoolAddress,
  getWalletPkh,
  PAYOUT_MULTIPLIER,
} from "./lib/cardano";

export interface Policy {
  id: string;
  strikePrice: number;
  thresholdPct: number;
  premium: number;
  payout: number;
  expiryDate: string;
  status: "Active" | "Claimed" | "Expired";
  txHash?: string;
}

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0.2557);
  const [myPolicies, setMyPolicies] = useState<Policy[]>([]);
  const [otherPolicies, setOtherPolicies] = useState<Policy[]>([]);
  const [poolStats, setPoolStats] = useState({
    totalDeposits: 0,
    totalReserved: 0,
    premiumsEarned: 0,
  });
  const [poolInitialized, setPoolInitialized] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [txPending, setTxPending] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDemoMode = walletAddress === "demo";
  const isRealWallet = walletAddress !== null && !isDemoMode;

  // Load on-chain state
  const loadOnChainState = async () => {
    try {
      const stats = await fetchPoolStats();
      if (stats) {
        setPoolInitialized(true);
        setPoolStats({
          totalDeposits: stats.totalDeposits,
          totalReserved: stats.totalReserved,
          premiumsEarned: stats.premiumsEarned,
        });
      }
    } catch (e) {
      console.warn("Pool check failed:", e);
    }

    try {
      const onChainPolicies = await fetchPolicies();
      const myPkh = getWalletPkh();

      const mapPolicy = (p: any): Policy => {
        const mapped = {
          id: p.txHash,
          strikePrice: p.strikePrice / 100_000_000,
          thresholdPct: p.thresholdBps / 100,
          premium: p.premiumPaid / 1_000_000,
          payout: p.payoutAmount / 1_000_000,
          expiryDate: new Date(p.expiryTime).toISOString().split("T")[0],
          status: p.status as "Active" | "Claimed" | "Expired",
          txHash: p.txHash,
        };
        console.log("[mapPolicy]", p.txHash.slice(0, 12), "status:", p.status, "strike:", mapped.strikePrice, "threshold:", mapped.thresholdPct, "expiry:", mapped.expiryDate);
        return mapped;
      };

      // Match by pkh or full address (old policies used bech32, new ones use pkh)
      const isMine = (p: any) =>
        myPkh ? (p.owner === myPkh || p.owner.includes(myPkh)) : false;

      const mine = onChainPolicies.filter(isMine).map(mapPolicy);
      const others = onChainPolicies.filter((p) => !isMine(p)).map(mapPolicy);
      setMyPolicies(mine);
      setOtherPolicies(others);
    } catch (e) {
      console.warn("Policy fetch failed:", e);
    }
  };

  // Load on-chain state on mount (only if not demo)
  useEffect(() => {
    if (!isDemoMode) loadOnChainState();
  }, [isDemoMode]);

  const handleConnect = async (addr: string) => {
    setWalletAddress(addr);
    if (addr !== "demo") await loadOnChainState();
  };

  // Initialize pool on-chain
  const handleInitPool = async () => {
    setTxPending("Initializing pool...");
    setError(null);
    try {
      const depositAmount = 50_000_000; // 50 ADA initial deposit
      const txHash = await initPool(depositAmount);
      setLastTxHash(txHash);
      setPoolInitialized(true);
      setPoolStats({ totalDeposits: depositAmount, totalReserved: 0, premiumsEarned: 0 });
      setTxPending(null);
    } catch (e: any) {
      console.error("Init pool failed:", e);
      setError(`Pool init failed: ${e.message}`);
      setTxPending(null);
    }
  };

  // Deposit to pool
  const handleDeposit = async (amountAda: number) => {
    if (!isRealWallet) {
      // Simulated
      setPoolStats((prev) => ({
        ...prev,
        totalDeposits: prev.totalDeposits + amountAda * 1_000_000,
      }));
      return;
    }

    setDepositing(true);
    setError(null);
    try {
      const txHash = await depositToPool(amountAda * 1_000_000);
      setLastTxHash(txHash);
      await loadOnChainState();
    } catch (e: any) {
      console.error("Deposit failed:", e);
      setError(`Deposit failed: ${e.message}`);
    } finally {
      setDepositing(false);
    }
  };

  // Subscribe — real on-chain or simulated
  const handleSubscribe = async (thresholdPct: number, periodDays: number, premiumAda: number) => {
    const premiumLovelace = premiumAda * 1_000_000;
    const payoutAda = premiumAda * PAYOUT_MULTIPLIER;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + periodDays);

    if (isRealWallet && poolInitialized) {
      setTxPending("Submitting subscribe transaction...");
      setError(null);
      try {
        const txHash = await chainSubscribe(
          thresholdPct * 100, // convert % to bps
          premiumLovelace,
          periodDays * 24 * 3600 * 1000,
          Math.round(currentPrice * 100_000_000), // scale to exponent -8
          -8,
        );
        setLastTxHash(txHash);
        setMyPolicies((prev) => [
          {
            id: txHash,
            strikePrice: currentPrice,
            thresholdPct,
            premium: premiumAda,
            payout: payoutAda,
            expiryDate: expiry.toISOString().split("T")[0],
            status: "Active",
            txHash,
          },
          ...prev,
        ]);
        // Refresh on-chain state after indexer catches up
        setTimeout(() => loadOnChainState(), 15000);
        setTxPending(null);
      } catch (e: any) {
        console.error("Subscribe failed:", e);
        setError(`Subscribe failed: ${e.message}`);
        setTxPending(null);
      }
    } else {
      // Simulated mode
      setMyPolicies((prev) => [
        {
          id: `policy-${Date.now()}`,
          strikePrice: currentPrice,
          thresholdPct,
          premium: premiumAda,
          payout: payoutAda,
          expiryDate: expiry.toISOString().split("T")[0],
          status: "Active",
        },
        ...prev,
      ]);
      setPoolStats((prev) => ({
        ...prev,
        totalDeposits: prev.totalDeposits + payoutAda * 1_000_000,
        totalReserved: prev.totalReserved + payoutAda * 1_000_000,
        premiumsEarned: prev.premiumsEarned + premiumAda * 1_000_000,
      }));
    }
  };

  const handleClaim = (id: string) => {
    setMyPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "Claimed" as const } : p)),
    );
  };

  const handleExpire = (id: string) => {
    setMyPolicies((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        setPoolStats((s) => ({
          ...s,
          totalReserved: s.totalReserved - p.payout * 1_000_000,
        }));
        return { ...p, status: "Expired" as const };
      }),
    );
  };

  const connected = !!walletAddress;
  const hasMyPolicies = myPolicies.length > 0;
  const hasPolicies = hasMyPolicies || otherPolicies.length > 0;
  const hasActiveClaim = myPolicies.some((p) => {
    if (p.status !== "Active") return false;
    const devalPct = ((currentPrice - p.strikePrice) / p.strikePrice) * 100;
    return devalPct >= p.thresholdPct;
  });
  const hasClaimed = myPolicies.some((p) => p.status === "Claimed");

  return (
    <div className="app">
      <header>
        <h1>DevalGuard</h1>
        <p>Parametric devaluation insurance on Cardano</p>
      </header>

      {/* Status bar */}
      {txPending && (
        <div className="tx-status tx-pending">{txPending}</div>
      )}
      {error && (
        <div className="tx-status tx-error" onClick={() => setError(null)}>{error} (click to dismiss)</div>
      )}
      {lastTxHash && !txPending && !error && (
        <div className="tx-status tx-success">
          Last tx:{" "}
          <a href={`https://preprod.cardanoscan.io/transaction/${lastTxHash}`} target="_blank" rel="noreferrer">
            {lastTxHash.slice(0, 16)}...
          </a>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
        <div className="hint-anchor" style={{ flex: "0 0 auto" }}>
          <Hint step={1} text="Connect your wallet or enter demo mode" visible={!connected} />
          <WalletConnect
            address={walletAddress}
            onConnect={handleConnect}
            onDisconnect={() => {
              setWalletAddress(null);
              setMyPolicies([]);
              setOtherPolicies([]);
              setPoolStats({ totalDeposits: 0, totalReserved: 0, premiumsEarned: 0 });
              setPoolInitialized(false);
              setLastTxHash(null);
              setError(null);
            }}
            highlight={!connected}
          />
        </div>
        {!connected && (
          <button
            onClick={() => {
              setWalletAddress("demo");
              setPoolInitialized(true);
              setPoolStats({ totalDeposits: 500_000_000, totalReserved: 0, premiumsEarned: 0 });
              setMyPolicies([]);
              setOtherPolicies([]);
            }}
            style={{ maxWidth: 180, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
          >
            Demo Mode
          </button>
        )}
      </div>

      {/* Pool init button for real wallet */}
      {isRealWallet && !poolInitialized && !txPending && (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <button onClick={handleInitPool} style={{ maxWidth: 400 }}>
            Initialize Pool on PreProd (50 ADA deposit)
          </button>
          <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
            This creates the liquidity pool on-chain. Only needed once.
          </p>
        </div>
      )}

      <div className="grid">
        <div className={`hint-anchor ${hasMyPolicies && !hasActiveClaim && !hasClaimed ? "hint-glow" : ""}`} style={{ gridColumn: "1 / -1" }}>
          <Hint step={3} text="Drag the price slider up to simulate a devaluation" visible={hasMyPolicies && !hasActiveClaim && !hasClaimed} />
          <PriceDisplay
            price={currentPrice}
            onPriceChange={setCurrentPrice}
            demoMode={isDemoMode}
          />
        </div>

        <div className={`hint-anchor ${connected && !hasMyPolicies ? "hint-glow" : ""}`}>
          <Hint step={2} text="Pick a threshold, period & premium — then subscribe" visible={connected && !hasMyPolicies} />
          <Subscribe
            currentPrice={currentPrice}
            connected={connected}
            onSubscribe={handleSubscribe}
          />
        </div>

        <Pool stats={poolStats} connected={connected} onDeposit={handleDeposit} depositing={depositing} />

        <div className={`full-width hint-anchor ${(hasActiveClaim && !hasClaimed) ? "hint-glow" : ""}`}>
          <Hint step={4} text="Threshold reached! Hit Claim to collect your payout" visible={hasActiveClaim && !hasClaimed} />
          {hasClaimed && <Hint step={0} text="Done! Full DevalGuard flow complete." visible={true} />}
          <Policies
            myPolicies={myPolicies}
            otherPolicies={otherPolicies}
            currentPrice={currentPrice}
            connected={connected}
            onClaim={handleClaim}
            onExpire={handleExpire}
          />
        </div>
      </div>

      {/* Network info */}
      <div style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
        {isDemoMode ? "Demo Mode — all simulated, no blockchain" : isRealWallet ? "PreProd Testnet — real on-chain transactions" : "Not connected"}
        {isRealWallet && <span> | Pool: {getPoolAddress().slice(0, 20)}...</span>}
      </div>
    </div>
  );
}
