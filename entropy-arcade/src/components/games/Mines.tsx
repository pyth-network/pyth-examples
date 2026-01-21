"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bomb, Gem, AlertTriangle, Sparkles } from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatEther, keccak256, concatHex, toHex, parseEther } from "viem";
const PLINKO_ADDR = "0xA14eC31d36C5ba64307e3eDd5a7B7497a02BB8fB";

const GRID_SIZE = 25;
const ROWS = 12 as const;

/** Minimal PlinkoEntropy ABI */
const PLINKO_ABI = [
  {
    type: "function",
    name: "getCurrentFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint128" }],
  },
  {
    type: "function",
    name: "play",
    stateMutability: "payable",
    inputs: [{ name: "rows", type: "uint8" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "event",
    name: "BetRequested",
    anonymous: false,
    inputs: [
      { indexed: false, name: "seq", type: "uint64" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "stakeWei", type: "uint256" },
      { indexed: false, name: "rows", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "BetSettled",
    anonymous: false,
    inputs: [
      { indexed: false, name: "seq", type: "uint64" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "stakeWei", type: "uint256" },
      { indexed: false, name: "rows", type: "uint8" },
      { indexed: false, name: "bin", type: "uint256" },
      { indexed: false, name: "payout", type: "uint256" },
    ],
  },
] as const;

function pseudoShuffle(seedHex: `0x${string}`, n: number) {
  const arr = Array.from({ length: n }, (_, i) => i);
  let seed = BigInt(seedHex);
  for (let i = 0; i < n; i++) {
    const h = keccak256(
      concatHex([toHex(seed, { size: 32 }), toHex(i, { size: 32 })]),
    );
    const r = BigInt(h);
    const j = i + Number(r % BigInt(n - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
    seed ^= r;
  }
  return arr;
}

export default function MinesGame() {
  const [betEth, setBetEth] = useState("0.01");

  const [revealed, setRevealed] = useState<number[]>([]);
  const [bombs, setBombs] = useState<Set<number>>(new Set());
  const [gems, setGems] = useState<Set<number>>(new Set());
  const [animating, setAnimating] = useState(false);

  const [pendingSeq, setPendingSeq] = useState<bigint | null>(null);
  const lastStakeWeiRef = useRef<bigint>(0n);
  const lastFeeWeiRef = useRef<bigint>(0n);

  const [settle, setSettle] = useState<{
    seq: bigint;
    bin: bigint;
    payoutWei: bigint;
    stakeWei: bigint;
    feeWei: bigint;
    multiplier: number;
    pnlWeiGame: bigint;
    pnlWeiNet: bigint;
  } | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data: feeWei } = useReadContract({
    address: PLINKO_ADDR,
    abi: PLINKO_ABI,
    functionName: "getCurrentFee",
    query: { refetchInterval: 10_000 },
  });

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: waitingReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useWatchContractEvent({
    address: PLINKO_ADDR,
    abi: PLINKO_ABI,
    eventName: "BetRequested",
    onLogs: (logs) => {
      logs.forEach((l: any) => {
        const { player, seq, stakeWei } = l.args || {};
        if (player?.toLowerCase?.() === address?.toLowerCase?.()) {
          setPendingSeq(BigInt(seq));
          lastStakeWeiRef.current = BigInt(stakeWei);
        }
      });
    },
  });

  useWatchContractEvent({
    address: PLINKO_ADDR,
    abi: PLINKO_ABI,
    eventName: "BetSettled",
    onLogs: (logs) => {
      logs.forEach((l: any) => {
        const { player, seq, bin, payout } = l.args || {};
        if (player?.toLowerCase?.() !== address?.toLowerCase?.()) return;
        if (pendingSeq && BigInt(seq) !== pendingSeq) return;

        const stakeWei = lastStakeWeiRef.current;
        const feeUsed = lastFeeWeiRef.current;
        const payoutWei = BigInt(payout);

        const mult = stakeWei > 0n ? Number(payoutWei) / Number(stakeWei) : 0;
        const pnlGame = payoutWei - stakeWei;
        const pnlNet = payoutWei - (stakeWei + feeUsed);

        setSettle({
          seq: BigInt(seq),
          bin: BigInt(bin),
          payoutWei,
          stakeWei,
          feeWei: feeUsed,
          multiplier: mult,
          pnlWeiGame: pnlGame,
          pnlWeiNet: pnlNet,
        });
        setPendingSeq(null);

        // Visual pattern: seed from on-chain values, choose N gems = 12 - bin (at least 1), bombs elsewhere
        const seed = keccak256(
          concatHex([
            toHex(BigInt(seq), { size: 8 }),
            toHex(BigInt(bin), { size: 32 }),
            toHex(stakeWei, { size: 32 }),
            toHex(payoutWei, { size: 32 }),
          ]),
        );
        const order = pseudoShuffle(seed, GRID_SIZE);
        const gemsCount = Math.max(1, 12 - Number(bin)); // fun mapping
        const g = new Set(order.slice(0, gemsCount));
        const b = new Set(order.slice(gemsCount));

        setGems(g);
        setBombs(b);
        setRevealed([]);
        setAnimating(true);

        // Reveal gems sequentially for flair
        let i = 0;
        const id = setInterval(() => {
          setRevealed((prev) => {
            const next = prev.slice();
            if (i < GRID_SIZE) next.push(order[i]);
            i++;
            return next;
          });
          if (i >= GRID_SIZE) {
            clearInterval(id);
            setAnimating(false);
          }
        }, 40);
      });
    },
  });

  const notOnBaseSepolia = isConnected && chainId !== baseSepolia.id;

  const play = async () => {
    if (!isConnected || notOnBaseSepolia || !feeWei) return;
    const stake = parseEther(betEth || "0");
    const fee = BigInt(feeWei.toString());
    lastStakeWeiRef.current = stake;
    lastFeeWeiRef.current = fee;

    // reset visuals
    setRevealed([]);
    setGems(new Set());
    setBombs(new Set());
    setAnimating(false);
    setSettle(null);

    await writeContractAsync({
      address: PLINKO_ADDR,
      abi: PLINKO_ABI,
      functionName: "play",
      args: [ROWS],
      value: stake + fee,
    });
  };

  const tileState = (idx: number) => {
    if (!revealed.includes(idx)) return "hidden";
    if (gems.has(idx)) return "gem";
    return "mine";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Mines (On-chain Outcome)
          </h1>
          <div className="text-sm text-white/70">
            {isConnected ? (
              notOnBaseSepolia ? (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <AlertTriangle size={14} /> Switch to Base Sepolia
                </span>
              ) : (
                <>
                  Entropy fee:{" "}
                  <b>
                    {feeWei
                      ? Number(formatEther(BigInt(feeWei))).toFixed(6)
                      : "—"}
                  </b>{" "}
                  ETH
                </>
              )
            ) : (
              <>Connect wallet</>
            )}
            {pendingSeq && (
              <div className="text-xs opacity-80">
                Waiting… seq {pendingSeq.toString()}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px,1fr] gap-8">
          {/* Controls */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Bet (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={betEth}
                    onChange={(e) => setBetEth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
                  />
                </div>

                <button
                  onClick={play}
                  disabled={
                    !isConnected ||
                    notOnBaseSepolia ||
                    !feeWei ||
                    isPending ||
                    waitingReceipt
                  }
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all"
                >
                  {isPending || waitingReceipt
                    ? "Requesting…"
                    : "Bet (on-chain)"}
                </button>
              </div>
            </div>

            {settle && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-2 text-sm">
                <Row k="Seq" v={settle.seq.toString()} mono />
                <Row k="Bin" v={settle.bin.toString()} />
                <Row k="Multiplier" v={`${settle.multiplier.toFixed(2)}x`} />
                <Row
                  k="Stake"
                  v={`${Number(formatEther(settle.stakeWei)).toFixed(6)} ETH`}
                />
                <Row
                  k="Fee"
                  v={`${Number(formatEther(settle.feeWei)).toFixed(6)} ETH`}
                />
                <Row
                  k="Payout"
                  v={`${Number(formatEther(settle.payoutWei)).toFixed(6)} ETH`}
                />
                <div className="h-px bg-white/10 my-1" />
                <Row
                  k="Game P&L"
                  v={`${Number(formatEther(settle.pnlWeiGame)).toFixed(6)} ETH`}
                  color={
                    settle.pnlWeiGame >= 0n
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                />
                <Row
                  k="Net P&L"
                  v={`${Number(formatEther(settle.pnlWeiNet)).toFixed(6)} ETH`}
                  color={
                    settle.pnlWeiNet >= 0n ? "text-emerald-400" : "text-red-400"
                  }
                />
                <div className="text-[11px] text-white/50 mt-1">
                  Visual grid seeded from on-chain args; payout is finalized
                  on-chain.
                </div>
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto">
              {Array.from({ length: GRID_SIZE }, (_, i) => {
                const state = tileState(i);
                return (
                  <div
                    key={i}
                    className={[
                      "aspect-square rounded-lg transition-all duration-200 transform flex items-center justify-center border-2",
                      state === "hidden" &&
                        "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600",
                      state === "gem" &&
                        "bg-gradient-to-br from-emerald-500 to-emerald-600 border-transparent scale-105",
                      state === "mine" &&
                        "bg-gradient-to-br from-red-500 to-red-600 border-transparent scale-105",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {state === "gem" && <Gem className="w-6 h-6 text-white" />}
                    {state === "mine" && (
                      <Bomb className="w-6 h-6 text-white" />
                    )}
                  </div>
                );
              })}
            </div>
            {animating && (
              <div className="mt-4 text-center text-white/70 text-sm inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Revealing…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  mono,
  color,
}: {
  k: string;
  v: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{k}</span>
      <span
        className={`${mono ? "font-mono" : "font-semibold"} ${color || ""}`}
      >
        {v}
      </span>
    </div>
  );
}
