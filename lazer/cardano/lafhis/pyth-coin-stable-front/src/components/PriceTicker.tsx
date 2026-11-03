import { HermesClient } from "@pythnetwork/hermes-client";
import { useEffect, useState } from "react";

type TickerItem = {
  symbol: string;
  price: number;
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

export default function PriceTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const client = new HermesClient("https://hermes.pyth.network", {});
        const allFeeds = await client.getPriceFeeds({ assetType: "crypto" });

        const usdFeeds = allFeeds
          .filter((f) => (f.attributes.display_symbol ?? "").toUpperCase().endsWith("/USD"))
          .slice(0, 40);

        const ids = usdFeeds.map((f) => f.id);
        const idToSymbol = Object.fromEntries(
          usdFeeds.map((f) => [f.id, f.attributes.display_symbol as string]),
        );

        const updates = await client.getLatestPriceUpdates(ids);
        const parsed = updates.parsed ?? [];

        const tickerItems: TickerItem[] = parsed
          .map((feed) => ({
            symbol: idToSymbol[feed.id] ?? feed.id,
            price: Number(feed.price.price) * Math.pow(10, feed.price.expo),
          }))
          .filter((item) => item.price > 0);

        setItems(tickerItems);
      } catch (e) {
        console.error("Ticker fetch failed", e);
      }
    }

    void fetchPrices();
  }, []);

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-violet-500/20 bg-slate-950/60 py-2.5 px-4">
        <p className="text-[10px] text-violet-100/40 animate-pulse">Loading live prices...</p>
      </div>
    );
  }

  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden rounded-xl border border-violet-500/20 bg-slate-950/60">
      <div className="ticker-track flex gap-6 whitespace-nowrap py-2.5">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-bold shrink-0">
            <span className="text-violet-300">{item.symbol}</span>
            <span className="text-cyan-300">${formatPrice(item.price)}</span>
            <span className="text-violet-500/40 select-none">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
