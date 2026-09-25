// src/app/profile/page.tsx
"use client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useReveal } from "@/components/useReveal";
import { Button } from "@/components/ui/Button";

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatEther, parseEther } from "viem";
import { useEffect, useState } from "react";

const PLINKO_ADDR = "0x32253e11d5aB2F0244bD21c51C880C7Bc5Dbf06a";
const ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }],
    outputs: [],
  },
] as const;

function useEthUsd() {
  const [usd, setUsd] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        );
        const j = await r.json();
        const p = j?.ethereum?.usd;
        if (typeof p === "number") setUsd(p);
      } catch {}
    })();
  }, []);
  return usd;
}

// export default function ProfilePage() {
//   useReveal();
//   return (
//     <>
//  <Navbar />
//       <main className="sm:p-24 px-8 py-16">
//         <h1 className="text-3xl sm:text-5xl font-bold" data-animate>
//           Profile
//         </h1>
//         <p className="mt-3 text-secondary-white max-w-2xl" data-animate>
//           Sign in to manage your staking sessions and history.
//         </p>
//         <div className="mt-8" data-animate>
//           <Button>Sign in</Button>
//         </div>
//       </main>
//       <Footer />
//     </>
//   );
// }

export default function ProfilePage() {
  const ethUsd = useEthUsd();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balWei, refetch } = useReadContract({
    address: PLINKO_ADDR as `0x${string}`,
    abi: ABI,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 10000 },
  });
  const { writeContractAsync, isPending } = useWriteContract();

  const balEth = balWei ? Number(formatEther(balWei as bigint)) : 0;
  const balUsd = ethUsd ? balEth * ethUsd : null;

  const [amtEth, setAmtEth] = useState("0.01");

  async function onWithdraw() {
    if (!isConnected || chainId !== baseSepolia.id) return;
    const amt = parseEther(amtEth || "0");
    await writeContractAsync({
      address: PLINKO_ADDR as `0x${string}`,
      abi: ABI,
      functionName: "withdraw",
      args: [amt],
    });
    await refetch();
  }
  useReveal();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Navbar />
      <div className="max-w-lg w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
        <h1 className="text-3xl font-bold mb-4">Profile</h1>
        {!isConnected ? (
          <div className="text-white/70">
            Connect your wallet on the Home screen.
          </div>
        ) : chainId !== baseSepolia.id ? (
          <div className="text-amber-300">
            Wrong network.{" "}
            <button
              className="underline"
              onClick={() => switchChain({ chainId: baseSepolia.id })}
            >
              Switch to Base Sepolia
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-white/80">Arcade balance</div>
              <div className="text-2xl font-bold">
                {balUsd != null
                  ? balUsd.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })
                  : "…"}
                <span className="text-white/60 text-sm ml-2">
                  ({balEth.toFixed(6)} ETH)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/80">
                Withdraw amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={amtEth}
                onChange={(e) => setAmtEth(e.target.value)}
                className="w-full bg-slate-800/90 text-white px-4 py-2.5 rounded-lg border border-slate-600/50"
              />
              <button
                onClick={onWithdraw}
                disabled={isPending}
                className="w-full bg-slate-100 text-black font-semibold py-2.5 rounded-lg hover:bg-white"
              >
                {isPending ? "Withdrawing…" : "Withdraw"}
              </button>
              <div className="text-xs text-white/50">
                Funds withdraw to your connected wallet.
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
