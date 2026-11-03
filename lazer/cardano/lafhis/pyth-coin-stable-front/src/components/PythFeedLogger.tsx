import { HermesClient } from "@pythnetwork/hermes-client";
import { useEffect, useRef } from "react";

const TARGET_SYMBOLS = new Set(["ADA/USD", "BTC/USD", "ETH/USD", "BNB/USD"]);

export default function PythFeedLogger() {
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    let isMounted = true;

    async function logPriceFeeds() {
      try {
        const connection = new HermesClient("https://hermes.pyth.network", {});
        const allFeeds = await connection.getPriceFeeds({ assetType: "crypto" });
        const selectedFeeds = allFeeds.filter((feed) =>
          TARGET_SYMBOLS.has((feed.attributes.display_symbol ?? "").toUpperCase()),
        );
        const priceIds = selectedFeeds.map((feed) => feed.id);

        if (priceIds.length === 0) {
          console.warn("No feeds found for ADA/USD, BTC/USD, ETH/USD, and BNB/USD.");
          return;
        }

        const idToTicker = Object.fromEntries(
          selectedFeeds.map((feed) => [feed.id, feed.attributes.display_symbol]),
        );

        const priceUpdates = await connection.getLatestPriceUpdates(priceIds);
        if (!isMounted) return;

        const parsedUpdates = priceUpdates.parsed ?? [];
        for (const feed of parsedUpdates) {
          const price = Number(feed.price.price) * Math.pow(10, feed.price.expo);
          const ticker = idToTicker[feed.id] ?? feed.id;
          console.log(`${ticker}: $${price.toFixed(2)}`);
        }
      } catch (error) {
        console.error("Error loading Hermes price feeds:", error);
      }
    }

    void logPriceFeeds();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
