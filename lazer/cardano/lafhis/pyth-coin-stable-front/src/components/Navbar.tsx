import { CardanoWallet, useWallet } from "@meshsdk/react";
import Link from "next/link";
import { useEffect, useState } from "react";

const HORSESHOE_HEX = Buffer.from("horseshoe", "utf-8").toString("hex");

function HorseshoeCounter() {
  const { wallet, connected } = useWallet();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!connected) { setCount(null); return; }
    void (async () => {
      try {
        const assets = await wallet.getAssets();
        const total = assets
          .filter((a) => (a.unit as string).toLowerCase().endsWith(HORSESHOE_HEX))
          .reduce((sum, a) => sum + Number(a.quantity), 0);
        setCount(total);
      } catch {
        setCount(null);
      }
    })();
  }, [connected, wallet]);

  if (!connected || count === null) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1.5"
      title={`You have ${count} horseshoe token${count !== 1 ? "s" : ""}`}>
      <img src="/img/horseshoe.png" alt="horseshoe" className="h-5 w-5 object-contain" />
      <span className="text-[12px] font-bold tabular-nums text-yellow-300">{count}</span>
    </div>
  );
}

export default function Navbar() {
  return (
    <nav className="top-nav mx-auto mt-6 grid w-[92%] max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-violet-500/25 bg-slate-950/80 px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        <Link className="nav-chip" href="/create-game">
          Create Game
        </Link>
        <Link className="nav-chip" href="/join-game">
          Join Game
        </Link>
      </div>

      <Link href="/" className="inline-flex items-center justify-center">
        <span className="nav-logo-mark">
          <span className="nav-logo-top">COIN</span>
          <span className="nav-logo-bottom">STABLE</span>
        </span>
      </Link>

      <div className="wallet-nav-control flex items-center justify-end gap-2">
        <HorseshoeCounter />
        <CardanoWallet persist />
      </div>
    </nav>
  );
}
