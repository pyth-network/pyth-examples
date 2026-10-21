"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Spade,
  Heart,
  Diamond,
  Club,
  Plus,
  Minus,
  Trophy,
  Crown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import {
  formatEther,
  keccak256,
  toHex,
  concatHex,
  type Hex,
  parseEther,
} from "viem";
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
const PAYOUTS_X = [
  2.0, 1.3, 1.1, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 2.0,
];

/* ===== Cards / visuals ===== */
const suits = ["♠", "♥", "♦", "♣"] as const;
const ranks = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;
type Suit = (typeof suits)[number];
type Rank = (typeof ranks)[number];
type Card = { suit: Suit; rank: Rank };

function getSuitIcon(suit: Suit, size = 24) {
  const iconProps = {
    size,
    className:
      suit === "♥" || suit === "♦" ? "text-red-600" : "text-gray-900",
    strokeWidth: 2,
  };
  switch (suit) {
    case "♠":
      return <Spade {...iconProps} fill="currentColor" />;
    case "♥":
      return <Heart {...iconProps} fill="currentColor" />;
    case "♦":
      return <Diamond {...iconProps} fill="currentColor" />;
    case "♣":
      return <Club {...iconProps} fill="currentColor" />;
  }
}

function seededShuffle(seed: Hex, deck: Card[]) {
  const a = deck.slice();
  for (let i = 0; i < a.length; i++) {
    const h = keccak256(concatHex([seed, toHex(i, { size: 32 })]));
    const r = BigInt(h);
    const j = i + Number(r % BigInt(a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PokerGame: React.FC = () => {
  const [betEth, setBetEth] = useState("0.01");
  const [message, setMessage] = useState(
    "Click Play to request a provable deck!",
  );
  const [community, setCommunity] = useState<Card[]>([]);
  const [playersUI, setPlayersUI] = useState([
    { id: 1, name: "You", avatar: "🎮", hand: [] as Card[] },
    { id: 2, name: "Alex", avatar: "🤖", hand: [] as Card[] },
  ]);
  const [animating, setAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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

        // Visualize poker using a seed derived purely from on-chain args
        const seed = keccak256(
          concatHex([
            toHex(BigInt(seq), { size: 8 }),
            toHex(BigInt(bin), { size: 32 }),
            toHex(stakeWei, { size: 32 }),
            toHex(payoutWei, { size: 32 }),
            toHex(1n, { size: 32 }), // salt
          ]),
        );

        dealFromSeed(seed);
        setShowConfetti(payoutWei > 0n);
        setTimeout(() => setShowConfetti(false), 2000);
      });
    },
  });

  const fullDeck = useMemo(() => {
    const d: Card[] = [];
    for (const s of suits) for (const r of ranks) d.push({ suit: s, rank: r });
    return d;
  }, []);

  const notOnBaseSepolia = isConnected && chainId !== baseSepolia.id;

  const play = async () => {
    if (!isConnected || notOnBaseSepolia || !feeWei) return;
    const stake = parseEther(betEth || "0");
    const fee = BigInt(feeWei.toString());
    lastStakeWeiRef.current = stake;
    lastFeeWeiRef.current = fee;

    setMessage("Requesting deck… (on-chain)");
    await writeContractAsync({
      address: PLINKO_ADDR,
      abi: PLINKO_ABI,
      functionName: "play",
      args: [ROWS],
      value: stake + fee,
    });
  };

  function dealFromSeed(seed: Hex) {
    const shuffled = seededShuffle(seed, fullDeck);
    const d = shuffled.slice();
    const p = [
      { id: 1, name: "You", avatar: "🎮", hand: [] as Card[] },
      { id: 2, name: "Alex", avatar: "🤖", hand: [] as Card[] },
    ];
    setAnimating(true);
    setTimeout(() => {
      p[0].hand = [d.pop()!, d.pop()!];
      p[1].hand = [d.pop()!, d.pop()!];
      const c = [d.pop()!, d.pop()!, d.pop()!, d.pop()!, d.pop()!];
      setPlayersUI(p);
      setCommunity(c);
      setMessage("Showdown!");
      setAnimating(false);
    }, 700);
  }

  const Confetti = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
            animation: `fall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`,
          }}
        >
          <Sparkles
            size={16}
            className="text-yellow-400"
            style={{ transform: `rotate(${Math.random() * 360}deg)` }}
          />
        </div>
      ))}
      <style>{`@keyframes fall { to { transform: translateY(100vh); } }`}</style>
    </div>
  );

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
      {showConfetti && <Confetti />}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative w-full max-w-7xl h-[95vh] bg-gradient-to-br from-green-800 via-green-700 to-emerald-800 rounded-3xl shadow-2xl border-8 border-amber-900 overflow-hidden">
        {/* Header / fee */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm flex flex-col items-center">
          {isConnected ? (
            notOnBaseSepolia ? (
              <div className="inline-flex items-center gap-1 text-amber-300">
                <AlertTriangle size={14} /> Switch to Base Sepolia
              </div>
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
            <>Connect wallet to play.</>
          )}
          {pendingSeq && (
            <div className="mt-1">
              Awaiting settlement… seq {pendingSeq.toString()}
            </div>
          )}
        </div>

        {/* Center table & community */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="mb-16 flex gap-3 justify-center">
            {community.map((card, i) => (
              <div
                key={i}
                className="w-24 h-36 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center border-2 border-gray-200 transition-all duration-500 hover:scale-110 hover:-translate-y-2"
                style={{ transform: animating ? "scale(0.9)" : "scale(1)" }}
              >
                <div
                  className={`text-3xl font-bold ${card.suit === "♥" || card.suit === "♦" ? "text-red-600" : "text-gray-900"}`}
                >
                  {card.rank}
                </div>
                <div className="mt-1">{getSuitIcon(card.suit, 32)}</div>
              </div>
            ))}
            {community.length < 5 &&
              Array(5 - community.length)
                .fill(0)
                .map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="w-24 h-36 bg-green-600/30 rounded-xl border-2 border-dashed border-green-400/50 backdrop-blur"
                  ></div>
                ))}
          </div>

          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg border-2 border-yellow-400">
            {message}
          </div>
        </div>

        {/* Players */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-8">
          {playersUI.map((p) => (
            <div
              key={p.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-5 min-w-[260px] border-2 border-purple-500/30 backdrop-blur"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{p.avatar}</span>
                  <span className="font-bold text-white">{p.name}</span>
                </div>
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                  PLAYER
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {p.hand.length > 0
                  ? p.hand.map((c, i) => (
                      <div
                        key={i}
                        className="w-16 h-24 bg-white rounded-lg shadow-xl flex flex-col items-center justify-center border-2 border-gray-200"
                      >
                        <div
                          className={`text-xl font-bold ${c.suit === "♥" || c.suit === "♦" ? "text-red-600" : "text-gray-900"}`}
                        >
                          {c.rank}
                        </div>
                        {getSuitIcon(c.suit, 24)}
                      </div>
                    ))
                  : [0, 1].map((i) => (
                      <div
                        key={i}
                        className="w-16 h-24 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg shadow-xl border-2 border-blue-700"
                      ></div>
                    ))}
              </div>
            </div>
          ))}
        </div>

        {/* Controls + stake + settlement */}
        <div className="absolute left-6 top-6 w-[320px] space-y-4">
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-700/50 shadow-xl">
            <h3 className="text-white font-semibold mb-3 text-lg">
              Play Settings
            </h3>
            <label className="text-slate-300 text-sm block mb-2 font-medium">
              Bet (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={betEth}
              onChange={(e) => setBetEth(e.target.value)}
              className="w-full bg-slate-800/90 text-white px-4 py-2.5 rounded-lg border border-slate-600/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() =>
                  setBetEth((b) => Math.max(0, Number(b || "0") / 2).toString())
                }
                className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-sm hover:bg-slate-700"
              >
                ½
              </button>
              <button
                onClick={() =>
                  setBetEth((b) => (Number(b || "0") * 2 || 0).toString())
                }
                className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-sm hover:bg-slate-700"
              >
                2×
              </button>
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
              className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3.5 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {isPending || waitingReceipt ? "Requesting…" : "Play (on-chain)"}
            </button>
          </div>

          {settle && (
            <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-700/50 shadow-xl">
              <h3 className="text-white font-semibold mb-3 text-lg">
                Settlement
              </h3>
              <div className="bg-slate-800/70 rounded-lg p-3 text-sm border border-slate-700/50 space-y-1">
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
              </div>
              <div className="text-[11px] text-white/50 mt-2">
                Outcome powered by PlinkoEntropy (Pyth Entropy). UI is a reveal;
                funds settle on-chain.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
      <span className="text-slate-300">{k}</span>
      <span
        className={`${mono ? "font-mono" : "font-semibold"} ${color || ""}`}
      >
        {v}
      </span>
    </div>
  );
}

export default PokerGame;
