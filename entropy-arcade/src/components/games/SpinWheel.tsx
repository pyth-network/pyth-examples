"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatEther, parseEther } from "viem";
const PLINKO_ADDR = "0xA14eC31d36C5ba64307e3eDd5a7B7497a02BB8fB";

/** PlinkoEntropy ABI (minimal) */
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

const ROWS = 12 as const;
const MULTS = [2.0, 1.3, 1.1, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 2.0];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function SpinWheel() {
  const [betEth, setBetEth] = useState("0.01");
  const [spinning, setSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [targetSegment, setTargetSegment] = useState<number | null>(null);

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

  const wheelRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

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

        // Drive wheel to land on on-chain bin
        setTargetSegment(Number(bin));
        finishSpinToTarget(Number(bin));
      });
    },
  });

  const notOnBaseSepolia = isConnected && chainId !== baseSepolia.id;
  const segmentAngle = 360 / MULTS.length;

  const spin = async () => {
    if (!isConnected || notOnBaseSepolia || !feeWei || spinning) return;

    const stake = parseEther(betEth || "0");
    const fee = BigInt(feeWei.toString());
    lastStakeWeiRef.current = stake;
    lastFeeWeiRef.current = fee;

    // reset UI
    setSettle(null);
    setTargetSegment(null);
    setSpinning(true);

    // kick off idle spin while we wait
    idleSpin();

    await writeContractAsync({
      address: PLINKO_ADDR,
      abi: PLINKO_ABI,
      functionName: "play",
      args: [ROWS],
      value: stake + fee,
    });
  };

  const idleSpin = () => {
    // constant rotation until settlement arrives
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const spinSpeed = 180; // deg/s
    let last = performance.now();

    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setCurrentRotation((r) => r + spinSpeed * dt);
      if (targetSegment === null)
        animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
  };

  const finishSpinToTarget = (bin: number) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startRot = currentRotation % 360;
    const target = 360 - (bin * segmentAngle + segmentAngle / 2); // pointer at top
    const baseSpins = 4;
    const totalRotation = baseSpins * 360 + ((target - startRot + 360) % 360);
    const duration = 3000;

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (!startTimeRef.current) return;
      const elapsed = now - startTimeRef.current;
      const p = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(p);
      setCurrentRotation(startRot + totalRotation * eased);
      if (p < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width,
      H = canvas.height;
    const cx = W / 2,
      cy = H / 2,
      radius = Math.min(W, H) * 0.45;
    ctx.clearRect(0, 0, W, H);

    const colors = (m: number) =>
      m === 0.6
        ? "#dc2626"
        : m >= 2
          ? "#f59e0b"
          : m >= 1.3
            ? "#8b5cf6"
            : m >= 1.1
              ? "#3b82f6"
              : "#10b981";

    MULTS.forEach((mult, i) => {
      const start = ((i * segmentAngle - 90) * Math.PI) / 180;
      const end = (((i + 1) * segmentAngle - 90) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colors(mult);
      ctx.fill();

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + (end - start) / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      ctx.font = "bold 22px sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(`${mult}x`, radius * 0.72, 0);
      ctx.restore();
    });

    // Rim
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 12;
    ctx.stroke();
  }, [segmentAngle]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Bet</h2>
                </div>
                <div className="text-sm text-white/70">
                  {isConnected ? (
                    chainId !== baseSepolia.id ? (
                      <span className="inline-flex items-center gap-1 text-amber-300">
                        <AlertTriangle size={14} /> Switch to Base Sepolia
                      </span>
                    ) : (
                      <>
                        Fee:{" "}
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
                </div>
              </div>

              <input
                type="number"
                value={betEth}
                onChange={(e) => setBetEth(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={spinning}
                step="0.001"
                min="0"
              />

              <div className="grid grid-cols-4 gap-2 my-4">
                {[0.01, 0.05, 0.1, 0.5].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetEth(String(amt))}
                    disabled={spinning}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <button
                onClick={spin}
                disabled={
                  !isConnected ||
                  chainId !== baseSepolia.id ||
                  !feeWei ||
                  isPending ||
                  waitingReceipt ||
                  spinning
                }
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
              >
                {spinning
                  ? "SPINNING…"
                  : isPending || waitingReceipt
                    ? "Requesting…"
                    : "SPIN (on-chain)"}
              </button>

              {settle && (
                <div
                  className={`mt-4 bg-slate-800/50 rounded-xl p-6 border-2 ${settle.pnlWeiNet >= 0n ? "border-green-500" : "border-red-500"}`}
                >
                  <div className="text-center">
                    <div className="text-gray-400 text-sm mb-2">Result</div>
                    <div
                      className={`text-5xl font-bold mb-2 ${settle.pnlWeiNet >= 0n ? "text-green-400" : "text-red-400"}`}
                    >
                      {MULTS[Number(settle.bin)]}x
                    </div>
                    <div className="text-gray-400 text-sm mt-2">
                      Payout: {Number(formatEther(settle.payoutWei)).toFixed(6)}{" "}
                      ETH
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      Seq {settle.seq.toString()} · Bin {settle.bin.toString()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {settle && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/20 text-sm">
                <Row
                  k="Stake"
                  v={`${Number(formatEther(settle.stakeWei)).toFixed(6)} ETH`}
                />
                <Row
                  k="Fee"
                  v={`${Number(formatEther(settle.feeWei)).toFixed(6)} ETH`}
                />
                <Row k="Multiplier" v={`${settle.multiplier.toFixed(2)}x`} />
                <Row
                  k="Payout"
                  v={`${Number(formatEther(settle.payoutWei)).toFixed(6)} ETH`}
                />
                <div className="h-px bg-white/10 my-1" />
                <Row
                  k="Game P&L"
                  v={`${Number(formatEther(settle.pnlWeiGame)).toFixed(6)} ETH`}
                  color={
                    settle.pnlWeiGame >= 0n ? "text-green-400" : "text-red-400"
                  }
                />
                <Row
                  k="Net P&L"
                  v={`${Number(formatEther(settle.pnlWeiNet)).toFixed(6)} ETH`}
                  color={
                    settle.pnlWeiNet >= 0n ? "text-green-400" : "text-red-400"
                  }
                />
                <div className="text-[11px] text-white/50 mt-1">
                  Wheel is a visualizer for the on-chain PlinkoEntropy result.
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-8 border border-purple-500/20">
              <div className="relative flex items-center justify-center py-8">
                {/* Pointer */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="relative">
                    <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[35px] border-t-yellow-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-yellow-300" />
                  </div>
                </div>

                {/* Wheel */}
                <div className="relative w-full max-w-[500px] aspect-square">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl animate-pulse" />
                  <div className="relative w-full h-full">
                    <canvas
                      ref={wheelRef}
                      width={600}
                      height={600}
                      className="absolute inset-0 w-full h-full"
                      style={{
                        transform: `rotate(${currentRotation}deg)`,
                        transition: "none",
                        filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))",
                      }}
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-8 border-slate-600 shadow-2xl flex items-center justify-center z-10">
                      <Sparkles className="w-10 h-10 text-purple-400" />
                    </div>
                  </div>
                </div>
              </div>

              {settle && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-bold text-white">Outcome</h3>
                  </div>
                  <div className="grid grid-cols-13 gap-1">
                    {MULTS.map((m, i) => (
                      <div
                        key={i}
                        className={`px-2 py-1 text-center rounded ${settle.bin === BigInt(i) ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-200"}`}
                      >
                        {m}x
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-white/60 mt-2">
                    Highlighted = chosen bin from on-chain event.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-300">{k}</span>
      <span className={`font-semibold ${color || ""}`}>{v}</span>
    </div>
  );
}
