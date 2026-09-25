// src/components/games/Plinko.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Settings, Volume2, VolumeX, AlertTriangle } from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useChainId,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatEther, parseEther } from "viem";

/* =======================
   ON-CHAIN CONFIG
   ======================= */
const PLINKO_ADDR = "0xA14eC31d36C5ba64307e3eDd5a7B7497a02BB8fB";

const ABI = [
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

/* =======================
   FIXED MULTIPLIER ROW (MUST MATCH CONTRACT)
   ROWS = 12 → 13 bins
   ======================= */
const PAYOUTS_X = [
  2.0, 1.3, 1.1, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 2.0,
];

/* =======================
   ETH→USD price (client fetch)
   ======================= */
function useEthUsd(pollMs = 30000) {
  const [usd, setUsd] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    async function fetchPrice() {
      try {
        // Coinbase rates (robust)
        const res = await fetch(
          "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
        );
        const j = await res.json();
        const rate = parseFloat(j?.data?.rates?.USD);
        if (!isNaN(rate) && alive) setUsd(1 / rate); // API is quoted as 1 ETH = ?; sometimes inverse—guard:
      } catch {}
      try {
        // Fallback: CoinGecko
        const r = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        );
        const j = await r.json();
        const p = j?.ethereum?.usd;
        if (typeof p === "number" && alive) setUsd(p);
      } catch {}
    }
    fetchPrice();
    const id = setInterval(fetchPrice, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return usd;
}

function usdFmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
function ethToUsd(ethWei: bigint, ethUsd: number | null) {
  if (!ethUsd) return null;
  const eth = Number(formatEther(ethWei));
  return eth * ethUsd;
}

/* =======================
   ORIGINAL VISUALS (unchanged)
   ======================= */
class Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  gravity: number;
  damping: number;
  finished: boolean;
  slot: number | null;
  width: number;
  height: number;
  processed: boolean;
  trail: { x: number; y: number }[];

  constructor(x: number, width: number, height: number, ballRadius: number) {
    this.x = x;
    this.y = 50;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = 0;
    this.radius = ballRadius;
    this.color = "#ffd700";
    this.gravity = 0.6;
    this.damping = 0.98;
    this.finished = false;
    this.slot = null;
    this.width = width;
    this.height = height;
    this.processed = false;
    this.trail = [];
  }

  update(
    pegs: { x: number; y: number; hit: boolean; hitTime: number }[],
    pegRadius: number,
  ) {
    if (this.finished) return false;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.vy *= this.damping;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();
    let collided = false;
    pegs.forEach((peg) => {
      const dx = this.x - peg.x,
        dy = this.y - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.radius + pegRadius) {
        const angle = Math.atan2(dy, dx);
        this.x = peg.x + Math.cos(angle) * (this.radius + pegRadius);
        this.y = peg.y + Math.sin(angle) * (this.radius + pegRadius);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const bounceAngle = angle + (Math.random() - 0.5) * 0.4;
        this.vx = Math.cos(bounceAngle) * speed * 0.75;
        this.vy = Math.sin(bounceAngle) * speed * 0.75;
        if (!collided) {
          peg.hit = true;
          peg.hitTime = Date.now();
          collided = true;
        }
      }
    });
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -0.7;
    }
    if (this.x + this.radius > this.width) {
      this.x = this.width - this.radius;
      this.vx *= -0.7;
    }
    if (this.y > this.height - 100) this.finished = true;
    return collided;
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.trail.forEach((pos, i) => {
      const alpha = (i / this.trail.length) * 0.4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fill();
    });
    const glow = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.radius * 2,
    );
    glow.addColorStop(0, "rgba(255, 215, 0, 0.8)");
    glow.addColorStop(0.5, "rgba(255, 215, 0, 0.4)");
    glow.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    const ballGradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      0,
      this.x,
      this.y,
      this.radius,
    );
    ballGradient.addColorStop(0, "#fff4a3");
    ballGradient.addColorStop(0.5, "#ffd700");
    ballGradient.addColorStop(1, "#cc9900");
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballGradient;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/* =======================
   GAME UI
   ======================= */
export default function PlinkoGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const ethUsd = useEthUsd();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // On-chain inputs
  const [betEth, setBetEth] = useState("0.01");
  const rows = 12;
  const [pendingSeq, setPendingSeq] = useState<bigint | null>(null);

  // Track stake/fee used at play-time so we can compute multiplier and P&L precisely
  const lastStakeWeiRef = useRef<bigint>(0n);
  const lastFeeWeiRef = useRef<bigint>(0n);

  // Settlement result
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

  // Read live entropy fee
  const { data: feeWei } = useReadContract({
    address: PLINKO_ADDR as `0x${string}`,
    abi: ABI,
    functionName: "getCurrentFee",
    query: { refetchInterval: 10_000 },
  });

  const totalValueWei = useMemo(() => {
    try {
      const stake = parseEther(betEth || "0");
      const fee = BigInt(feeWei?.toString() || "0");
      return stake + fee;
    } catch {
      return 0n;
    }
  }, [betEth, feeWei]);

  // write
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: waitingReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Watch BetRequested → capture sequence & the exact stake/fee for this round
  useWatchContractEvent({
    address: PLINKO_ADDR as `0x${string}`,
    abi: ABI,
    eventName: "BetRequested",
    onLogs: (logs) => {
      for (const l of logs) {
        const args: any = (l as any).args || {};
        if (args?.player?.toLowerCase?.() === address?.toLowerCase?.()) {
          setPendingSeq(BigInt(args.seq));
          // Store stake/fee that our UI sent for this request
          // If user spam-clicks, last* reflect the most recent click.
          // For 1-at-a-time UX this is perfect.
          lastStakeWeiRef.current = BigInt(args.stakeWei);
          // fee not in event: use the value we read at click time (we set it before sending tx)
        }
      }
    },
  });

  // Watch settlement → compute multiplier & PnL
  useWatchContractEvent({
    address: PLINKO_ADDR as `0x${string}`,
    abi: ABI,
    eventName: "BetSettled",
    onLogs: (logs) => {
      for (const l of logs) {
        const args: any = (l as any).args || {};
        if (args?.player?.toLowerCase?.() !== address?.toLowerCase?.())
          continue;
        if (pendingSeq !== null && BigInt(args.seq) !== pendingSeq) continue;

        const payoutWei = BigInt(args.payout);
        const stakeWei = lastStakeWeiRef.current;
        const feeWeiUsed = lastFeeWeiRef.current;

        const mult = stakeWei > 0n ? Number(payoutWei) / Number(stakeWei) : 0;
        const pnlGame = payoutWei - stakeWei; // P/L on stake
        const pnlNet = payoutWei - (stakeWei + feeWeiUsed); // P/L incl. fee

        setSettle({
          seq: BigInt(args.seq),
          bin: BigInt(args.bin),
          payoutWei,
          stakeWei,
          feeWei: feeWeiUsed,
          multiplier: mult,
          pnlWeiGame: pnlGame,
          pnlWeiNet: pnlNet,
        });
        setPendingSeq(null);
        playWinSound(mult >= 1 ? 2 : 0.5);
      }
    },
  });

  // ======= SOUND FX =======
  const audioContextRef = useRef<AudioContext | null>(null);
  const playSound = (frequency: number, duration = 50) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + duration / 1000,
      );
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch {}
  };
  const playWinSound = (multiplier: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const frequencies = multiplier >= 1 ? [523, 659, 784] : [220, 196, 174];
      frequencies.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "sine";
        const t = ctx.currentTime + i * 0.08;
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        o.start(t);
        o.stop(t + 0.25);
      });
    } catch {}
  };

  // ======= VISUAL ENGINE =======
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<
    { x: number; y: number; hit: boolean; hitTime: number }[]
  >([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const pegRadius = 4;
    const spacing = width / (rows + 2);
    const verticalSpacing = (height - 150) / (rows + 1);

    const pegs: { x: number; y: number; hit: boolean; hitTime: number }[] = [];
    for (let row = 0; row < rows; row++) {
      const numPegs = row + 3;
      for (let i = 0; i < numPegs; i++) {
        const x = width / 2 - ((numPegs - 1) * spacing) / 2 + i * spacing;
        const y = 100 + row * verticalSpacing;
        pegs.push({ x, y, hit: false, hitTime: 0 });
      }
    }
    pegsRef.current = pegs;

    const drawMultipliersRow = () => {
      const slotCount = rows + 1; // 12 rows -> 13 bins
      const slotWidth = width / slotCount;
      const slotY = height - 90;

      // slot separators
      for (let i = 0; i <= slotCount; i++) {
        const x = i * slotWidth;
        const color = "rgba(255,255,255,0.06)";
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, slotY);
        ctx.lineTo(x, slotY + 70);
        ctx.stroke();
      }

      // labels
      ctx.textAlign = "center";
      ctx.font = "bold 13px Arial";
      for (let i = 0; i < slotCount; i++) {
        const mult = PAYOUTS_X[i];
        const x = i * slotWidth + slotWidth / 2;
        const color =
          mult >= 2
            ? "#ff003f"
            : mult >= 1.3
              ? "#ff8c1a"
              : mult >= 1.0
                ? "#ffd700"
                : mult >= 0.7
                  ? "#4CAF50"
                  : "#8b5cf6";
        // background bar
        const grad = ctx.createLinearGradient(x, slotY, x, slotY + 70);
        grad.addColorStop(0, color + "40");
        grad.addColorStop(1, color + "20");
        ctx.fillStyle = grad;
        ctx.fillRect(x - slotWidth / 2 + 1, slotY, slotWidth - 2, 70);
        // border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - slotWidth / 2 + 1, slotY, slotWidth - 2, 70);
        // text
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 5;
        ctx.shadowColor = color;
        ctx.fillText(`${mult.toFixed(2)}x`, x, slotY + 44);
        ctx.shadowBlur = 0;
      }

      // label
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Payout multipliers (on-chain)", 12, slotY - 12);
    };

    const animate = () => {
      ctx.fillStyle = "#0f0f23";
      ctx.fillRect(0, 0, width, height);

      pegs.forEach((peg) => {
        const timeSinceHit = Date.now() - peg.hitTime;
        const glow = peg.hit && timeSinceHit < 200 ? 1 - timeSinceHit / 200 : 0;
        if (glow > 0) {
          ctx.shadowBlur = 15 * glow;
          ctx.shadowColor = "#00ffff";
        }
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegRadius, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(
          peg.x,
          peg.y,
          0,
          peg.x,
          peg.y,
          pegRadius,
        );
        g.addColorStop(0, glow > 0 ? "#00ffff" : "#6b7280");
        g.addColorStop(1, glow > 0 ? "#0080ff" : "#4b5563");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.shadowBlur = 0;
        if (timeSinceHit > 200) peg.hit = false;
      });

      drawMultipliersRow();

      ballsRef.current.forEach((ball) => {
        const collided = ball.update(pegs, pegRadius);
        if (collided) playSound(400 + Math.random() * 200, 30);
        ball.draw(ctx);
        if (ball.finished && !ball.processed) {
          ball.processed = true;
          setTimeout(() => {
            ballsRef.current = ballsRef.current.filter((b) => b !== ball);
          }, 1000);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [rows, soundEnabled]);

  // ======= ACTION =======
  const dropBall = async () => {
    if (!isConnected) return;
    if (chainId !== baseSepolia.id) return;
    if (!feeWei) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // visual
    const ball = new Ball(canvas.width / 2, canvas.width, canvas.height, 8);
    ballsRef.current.push(ball);
    playSound(800, 100);

    // record stake/fee at click time
    const stake = parseEther(betEth || "0");
    const fee = BigInt(feeWei.toString());
    lastStakeWeiRef.current = stake;
    lastFeeWeiRef.current = fee;

    // send tx
    await writeContractAsync({
      address: PLINKO_ADDR as `0x${string}`,
      abi: ABI,
      functionName: "play",
      args: [rows],
      value: stake + fee,
    });
  };

  // ======= RENDER =======
  const notOnBaseSepolia = isConnected && chainId !== baseSepolia.id;

  const shownStakeUsd = ethToUsd(lastStakeWeiRef.current || 0n, ethUsd);
  const shownFeeUsd = ethToUsd(lastFeeWeiRef.current || 0n, ethUsd);
  const shownTotalUsd =
    shownStakeUsd != null && shownFeeUsd != null
      ? shownStakeUsd + shownFeeUsd
      : null;

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            Plinko{" "}
            <span className="text-white/60 text-2xl align-middle">
              • Pyth Entropy
            </span>
          </h1>
          <div className="text-xs text-white/60">
            Outcome source:{" "}
            <b className="text-white/80">On-chain (Pyth Entropy)</b>
          </div>

          <div className="mt-3 text-sm text-white/70">
            {isConnected ? (
              <>
                Connected: <span className="font-mono">{address}</span>{" "}
                {notOnBaseSepolia && (
                  <span className="inline-flex items-center gap-1 ml-2 text-amber-300">
                    <AlertTriangle size={14} /> Switch to Base Sepolia
                  </span>
                )}
              </>
            ) : (
              <>Connect your wallet from the Home hero button to play.</>
            )}
          </div>

          {feeWei !== undefined && ethUsd && (
            <div className="mt-2 text-white/80">
              Entropy fee: <b>{usdFmt(ethToUsd(BigInt(feeWei), ethUsd))}</b>{" "}
              <span className="opacity-60">
                ({Number(formatEther(BigInt(feeWei))).toFixed(6)} ETH)
              </span>
            </div>
          )}

          {txHash && (
            <div className="mt-2 text-sm">
              Tx:{" "}
              <a
                className="underline"
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View on BaseScan
              </a>
            </div>
          )}

          {pendingSeq !== null && (
            <div className="mt-2 text-sm text-white/80">
              Awaiting Pyth Entropy callback (seq {pendingSeq.toString()})…
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50 shadow-2xl">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-lg">
                <Settings size={20} className="text-purple-400" /> Play Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-2 font-medium">
                    Bet (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={betEth}
                    onChange={(e) => setBetEth(e.target.value)}
                    className="w-full bg-slate-800/90 text-white px-4 py-2.5 rounded-lg border border-slate-600/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() =>
                        setBetEth((b) =>
                          Math.max(0, Number(b || "0") / 2).toString(),
                        )
                      }
                      className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-all"
                    >
                      ½
                    </button>
                    <button
                      onClick={() =>
                        setBetEth((b) => (Number(b || "0") * 2 || 0).toString())
                      }
                      className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-all"
                    >
                      2×
                    </button>
                  </div>
                </div>

                <div className="text-sm text-white/80 space-y-1">
                  <div>
                    Stake:{" "}
                    <b>{usdFmt(ethToUsd(parseEther(betEth || "0"), ethUsd))}</b>{" "}
                    <span className="opacity-60">
                      ({Number(betEth || "0").toFixed(4)} ETH)
                    </span>
                  </div>
                  <div>
                    Fee: <b>{usdFmt(ethToUsd(BigInt(feeWei ?? 0), ethUsd))}</b>{" "}
                    {feeWei != null && (
                      <span className="opacity-60">
                        ({Number(formatEther(BigInt(feeWei))).toFixed(6)} ETH)
                      </span>
                    )}
                  </div>
                  <div>
                    Total: <b>{usdFmt(ethToUsd(totalValueWei, ethUsd))}</b>{" "}
                    <span className="opacity-60">
                      ({Number(formatEther(totalValueWei)).toFixed(6)} ETH)
                    </span>
                  </div>
                </div>

                <button
                  onClick={dropBall}
                  disabled={
                    !isConnected ||
                    notOnBaseSepolia ||
                    !feeWei ||
                    isPending ||
                    waitingReceipt ||
                    !PLINKO_ADDR.startsWith("0x")
                  }
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3.5 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-green-500/50 disabled:shadow-none transform hover:scale-105 active:scale-95"
                >
                  <Play size={20} fill="white" />
                  {isPending || waitingReceipt
                    ? "Requesting…"
                    : "Play (on-chain)"}
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-700 flex items-center justify-center gap-2 transition-all"
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  {soundEnabled ? "Sound On" : "Sound Off"}
                </button>
              </div>
            </div>

            {/* Settlement breakdown */}
            {settle && (
              <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50 shadow-2xl">
                <h3 className="text-white font-semibold mb-3 text-lg">
                  Settlement
                </h3>
                <div className="bg-slate-800/70 rounded-lg p-3 text-sm border border-slate-700/50 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Seq</span>
                    <span className="font-mono">{settle.seq.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Bin</span>
                    <span className="font-semibold">
                      {settle.bin.toString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Multiplier</span>
                    <span className="font-semibold">
                      {settle.multiplier.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Stake</span>
                    <span className="font-semibold">
                      {usdFmt(ethToUsd(settle.stakeWei, ethUsd))}{" "}
                      <span className="opacity-60">
                        ({Number(formatEther(settle.stakeWei)).toFixed(4)} ETH)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Fee</span>
                    <span className="font-semibold">
                      {usdFmt(ethToUsd(settle.feeWei, ethUsd))}{" "}
                      <span className="opacity-60">
                        ({Number(formatEther(settle.feeWei)).toFixed(6)} ETH)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Payout</span>
                    <span className="font-semibold">
                      {usdFmt(ethToUsd(settle.payoutWei, ethUsd))}{" "}
                      <span className="opacity-60">
                        ({Number(formatEther(settle.payoutWei)).toFixed(6)} ETH)
                      </span>
                    </span>
                  </div>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="flex justify-between">
                    <span className="text-slate-300">
                      Game P&amp;L (payout − stake)
                    </span>
                    <span
                      className={`font-bold ${settle.pnlWeiGame >= 0n ? "text-green-400" : "text-red-400"}`}
                    >
                      {usdFmt(ethToUsd(settle.pnlWeiGame, ethUsd))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">
                      Net P&amp;L (incl. fee)
                    </span>
                    <span
                      className={`font-bold ${settle.pnlWeiNet >= 0n ? "text-green-400" : "text-red-400"}`}
                    >
                      {usdFmt(ethToUsd(settle.pnlWeiNet, ethUsd))}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-white/50 mt-2">
                  Multipliers are on-chain: payout = stake × multiplier (fee is
                  a separate cost to request randomness).
                </div>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 shadow-2xl">
              <canvas
                ref={canvasRef}
                width={700}
                height={800}
                className="w-full rounded-xl"
                style={{ maxHeight: "85vh" }}
              />
              {notOnBaseSepolia && (
                <div className="mt-3 text-amber-300 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} /> Switch your wallet to{" "}
                  <b>Base Sepolia</b> to play.
                </div>
              )}
              {!PLINKO_ADDR.startsWith("0x") && (
                <div className="mt-2 text-rose-300 text-sm">
                  ⚠️ Set your contract address in <code>PLINKO_ADDR</code>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
