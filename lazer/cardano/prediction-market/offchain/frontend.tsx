import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { getWallets } from "./lib/bifrost.ts";
import type { CardanoWalletApi, CardanoWallet, CborHex, Transaction } from "./lib/bifrost-types.ts";

// ── Hooks ────────────────────────────────────────────────────────────────

function useMarketSocket() {
  const [price, setPrice] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState({ botStatus: "idle", cycleCount: 0, lastError: null as string | null });

  useEffect(() => {
    let ws: WebSocket;
    function connect() {
      ws = new WebSocket(`ws://${window.location.host}/ws`);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case "price": setPrice(msg.data); break;
          case "market": setMarket(msg.data); break;
          case "history": setHistory(msg.data); break;
          case "status": setStatus(msg.data); break;
        }
      };
      ws.onclose = () => setTimeout(connect, 2000);
    }
    connect();
    return () => ws?.close();
  }, []);

  return { price, market, history, status };
}

function useWallet() {
  const [wallets, setWallets] = useState<CardanoWallet[]>([]);
  const [api, setApi] = useState<CardanoWalletApi | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);

  const connectWallet = useCallback(async (wallet: CardanoWallet) => {
    const walletApi = await wallet.enable();
    setApi(walletApi);
    setWalletName(wallet.name);
    localStorage.setItem("wallet_id", wallet.id);
    const addrs = await walletApi.getUsedAddresses();
    if (addrs.length > 0) {
      try {
        const res = await fetch(`/api/hex-to-bech32?hex=${addrs[0]}`);
        const { bech32 } = await res.json();
        setAddress(bech32.slice(0, 12) + "..." + bech32.slice(-4));
      } catch {
        setAddress(addrs[0]!.slice(0, 8) + "...");
      }
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      const detected = getWallets();
      setWallets(detected);
      // Auto-reconnect from localStorage
      const savedId = localStorage.getItem("wallet_id");
      if (savedId) {
        const saved = detected.find((w) => w.id === savedId);
        if (saved) connectWallet(saved).catch(() => localStorage.removeItem("wallet_id"));
      }
    }, 500);
  }, [connectWallet]);

  const disconnect = useCallback(() => {
    setApi(null); setAddress(null); setWalletName(null);
    localStorage.removeItem("wallet_id");
  }, []);

  return { wallets, api, address, walletName, connect: connectWallet, disconnect };
}

// ── Formatters ───────────────────────────────────────────────────────────

const fmtUsd = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUsdShort = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

// ── Components ───────────────────────────────────────────────────────────

function PriceDisplay({ price }: { price: any }) {
  const prev = useRef<number | null>(null);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price && prev.current !== null && price.price !== prev.current) {
      setDir(price.price > prev.current ? "up" : "down");
      const t = setTimeout(() => setDir(null), 400);
      return () => clearTimeout(t);
    }
    if (price) prev.current = price.price;
  }, [price?.price]);

  if (!price) return (
    <div className="text-center py-12">
      <div className="inline-block w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm mt-3">Connecting to Pyth Lazer...</p>
    </div>
  );

  return (
    <div className="text-center py-8">
      <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] mb-2">Bitcoin</p>
      <p className={`text-5xl font-semibold tabular-nums tracking-tight transition-colors duration-300 ${
        dir === "up" ? "text-emerald-400" : dir === "down" ? "text-rose-400" : "text-white"
      }`}>
        ${fmtUsd(price.price)}
      </p>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Live via Pyth Lazer</span>
      </div>
    </div>
  );
}

function StatusBar({ status }: { status: any }) {
  const cfg: Record<string, { bg: string; dot: string; text: string }> = {
    idle:      { bg: "bg-gray-900/80", dot: "bg-gray-500", text: "Idle" },
    creating:  { bg: "bg-amber-950/40", dot: "bg-amber-400 animate-pulse", text: "Creating market..." },
    waiting:   { bg: "bg-emerald-950/40", dot: "bg-emerald-400", text: "Market open" },
    resolving: { bg: "bg-blue-950/40", dot: "bg-blue-400 animate-pulse", text: "Resolving..." },
    error:     { bg: "bg-rose-950/40", dot: "bg-rose-400", text: "Error" },
  };
  const c = cfg[status.botStatus] ?? cfg.idle!;

  return (
    <div className={`flex items-center justify-between px-4 py-2 text-xs ${c.bg} border-b border-white/5`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        <span className="text-gray-400">{c.text}</span>
      </div>
      <span className="text-gray-600">Cycle {status.cycleCount}</span>
    </div>
  );
}

function Countdown({ resolutionTime }: { resolutionTime: number }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, resolutionTime - Date.now()));
    tick();
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [resolutionTime]);

  const totalSecs = Math.ceil(remaining / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const pct = Math.max(0, Math.min(100, (remaining / (5 * 60_000)) * 100));
  const urgent = totalSecs <= 30;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-gray-500 uppercase tracking-wider">Closes in</span>
        <span className={`text-2xl font-semibold tabular-nums ${urgent ? "text-rose-400" : "text-white"}`}>
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${urgent ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MarketCard({ market, price }: { market: any; price: any }) {
  if (!market) return (
    <div className="border border-dashed border-gray-800 rounded-2xl p-10 text-center">
      <div className="inline-block w-5 h-5 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin mb-3" />
      <p className="text-gray-600 text-sm">Waiting for next market...</p>
    </div>
  );

  const target = Number(BigInt(market.targetPrice)) * Math.pow(10, -8);
  const yesR = BigInt(market.yesReserve);
  const noR = BigInt(market.noReserve);
  const total = yesR + noR;
  const yesPct = total > 0n ? Number(noR * 100n / total) : 50;
  const noPct = 100 - yesPct;
  const totalAda = (Number(BigInt(market.totalAda)) / 1_000_000).toFixed(0);
  const currentPrice = price?.price;
  const above = currentPrice ? currentPrice > target : null;

  return (
    <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 space-y-5 backdrop-blur-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Will BTC be above</p>
          <p className="text-xl font-semibold mt-0.5">${fmtUsd(target)}?</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Pool</p>
          <p className="text-xl font-semibold mt-0.5">{totalAda} <span className="text-sm text-gray-400">ADA</span></p>
        </div>
      </div>

      <Countdown resolutionTime={market.resolutionTime} />

      {above !== null && (
        <div className={`flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl ${
          above ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        }`}>
          <span className="text-lg">{above ? "\u2191" : "\u2193"}</span>
          Currently {above ? "above" : "below"} — ${fmtUsd(currentPrice)}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>YES {yesPct}%</span>
          <span>{noPct}% NO</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
          <div className="bg-emerald-500 rounded-l-full transition-all duration-500" style={{ width: `${yesPct}%` }} />
          <div className="bg-rose-500 rounded-r-full transition-all duration-500" style={{ width: `${noPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function BetPanel({ market, walletApi }: { market: any; walletApi: CardanoWalletApi | null }) {
  const [direction, setDirection] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const canBet = walletApi && market && !market.resolved;

  const placeBet = async () => {
    if (!walletApi || !canBet) return;
    setLoading(true);
    setResult(null);
    try {
      const utxos = await walletApi.getUtxos(undefined, undefined);
      const changeAddress = await walletApi.getChangeAddress();
      if (!utxos || utxos.length === 0) throw new Error("No UTxOs in wallet");

      const buildRes = await fetch("/api/build-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, amountAda: parseInt(amount), utxos, changeAddress }),
      });
      const buildData = await buildRes.json();
      if (buildData.error) throw new Error(buildData.error);

      const witness = await walletApi.signTx(buildData.txCbor as CborHex<Transaction>, true);

      const finalizeRes = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txCbor: buildData.txCbor, witness }),
      });
      const finalizeData = await finalizeRes.json();
      if (finalizeData.error) throw new Error(finalizeData.error);

      const txId = await walletApi.submitTx(finalizeData.txCbor);
      setResult(`+${buildData.tokensOut} ${direction.toUpperCase()} tokens (${txId.slice(0, 12)}...)`);
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">Place bet</p>

      <div className="grid grid-cols-2 gap-2">
        {(["yes", "no"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={`py-3 rounded-xl font-semibold text-base transition-all ${
              direction === d
                ? d === "yes" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
                : "bg-gray-800/80 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            }`}
          >{d === "yes" ? "YES \u2191" : "NO \u2193"}</button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700/50 focus-within:border-gray-600">
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-transparent text-xl font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-gray-500 text-sm font-medium">ADA</span>
      </div>

      <button
        onClick={placeBet}
        disabled={!canBet || loading}
        className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
          canBet && !loading
            ? direction === "yes"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
            : "bg-gray-800 text-gray-600 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Signing...
          </span>
        ) : !walletApi ? "Connect wallet to bet" : !market ? "Waiting for market..." : (
          `Bet ${amount} ADA on ${direction.toUpperCase()}`
        )}
      </button>

      {result && (
        <p className={`text-sm text-center ${result.startsWith("Error") ? "text-rose-400" : "text-emerald-400"}`}>
          {result}
        </p>
      )}
    </div>
  );
}

function WalletButton({ wallets, address, walletName, onConnect, onDisconnect }: {
  wallets: CardanoWallet[]; address: string | null; walletName: string | null;
  onConnect: (w: CardanoWallet) => void; onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (address) {
    return (
      <button onClick={onDisconnect}
        className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-800 pl-3 pr-4 py-2 rounded-full text-xs border border-gray-700/50 transition-colors">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-gray-400">{walletName}</span>
        <span className="text-gray-300 font-medium">{address}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="bg-white/10 hover:bg-white/15 backdrop-blur px-4 py-2 rounded-full text-xs font-medium transition-colors border border-white/10">
        Connect Wallet
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden z-10 min-w-48 shadow-xl shadow-black/40">
          {wallets.length > 0 ? wallets.map((w) => (
            <button key={w.id} onClick={() => { onConnect(w); setOpen(false); }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 flex items-center gap-3 transition-colors">
              <img src={w.icon} className="w-5 h-5 rounded" alt="" />
              {w.name}
            </button>
          )) : (
            <div className="px-4 py-3 text-xs text-gray-500">No CIP-30 wallets detected</div>
          )}
        </div>
      )}
    </div>
  );
}

function MarketHistory({ history }: { history: any[] }) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider px-1">History</p>
      {history.slice(0, 8).map((m, i) => {
        const target = Number(BigInt(m.targetPrice)) * Math.pow(10, -8);
        const won = m.winningSide === "yes";
        return (
          <div key={i} className="flex items-center justify-between bg-gray-900/40 rounded-xl px-4 py-3 border border-gray-800/40">
            <span className="text-sm text-gray-400">BTC &gt; ${fmtUsdShort(target)}</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
              won ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
            }`}>
              {m.winningSide?.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────

function App() {
  const { price, market, history, status } = useMarketSocket();
  const { wallets, api, address, walletName, connect, disconnect } = useWallet();

  return (
    <div className="min-h-screen flex flex-col">
      <StatusBar status={status} />

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Prediction Market</h1>
            <p className="text-[11px] text-gray-600">Pyth Lazer + Cardano</p>
          </div>
          <WalletButton wallets={wallets} address={address} walletName={walletName} onConnect={connect} onDisconnect={disconnect} />
        </header>

        <PriceDisplay price={price} />
        <MarketCard market={market} price={price} />
        <BetPanel market={market} walletApi={api} />
        <MarketHistory history={history} />

        <footer className="text-center text-[10px] text-gray-700 pt-4 pb-2">
          Team Cliley — Pythathon 2026
        </footer>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
