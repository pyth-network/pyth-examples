import { useState } from "react";
import PriceDisplay from "./components/PriceDisplay";
import Subscribe from "./components/Subscribe";
import Policies from "./components/Policies";
import Pool from "./components/Pool";
import WalletConnect from "./components/WalletConnect";

export interface Policy {
  id: string;
  strikePrice: number;
  thresholdPct: number;
  premium: number;
  payout: number;
  expiryDate: string;
  status: "Active" | "Claimed" | "Expired";
}

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState(1215.42);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [poolStats, setPoolStats] = useState({
    totalDeposits: 500_000_000,
    totalReserved: 0,
    premiumsEarned: 0,
  });

  const handleSubscribe = (thresholdPct: number, periodDays: number, premiumAda: number) => {
    const payout = premiumAda * 10;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + periodDays);

    const newPolicy: Policy = {
      id: `policy-${Date.now()}`,
      strikePrice: currentPrice,
      thresholdPct,
      premium: premiumAda,
      payout,
      expiryDate: expiry.toISOString().split("T")[0],
      status: "Active",
    };

    setPolicies((prev) => [newPolicy, ...prev]);
    setPoolStats((prev) => ({
      ...prev,
      totalReserved: prev.totalReserved + payout * 1_000_000,
      premiumsEarned: prev.premiumsEarned + premiumAda * 1_000_000,
    }));
  };

  const handleClaim = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "Claimed" as const } : p)),
    );
  };

  return (
    <div className="app">
      <header>
        <h1>DevalGuard</h1>
        <p>Parametric devaluation insurance on Cardano</p>
      </header>

      <WalletConnect address={walletAddress} onConnect={setWalletAddress} />

      <div className="grid">
        <PriceDisplay
          price={currentPrice}
          onPriceChange={setCurrentPrice}
        />

        <Subscribe
          currentPrice={currentPrice}
          connected={!!walletAddress}
          onSubscribe={handleSubscribe}
        />

        <Pool stats={poolStats} />

        <Policies
          policies={policies}
          currentPrice={currentPrice}
          onClaim={handleClaim}
        />
      </div>
    </div>
  );
}
