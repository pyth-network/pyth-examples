import BigNumber from "bignumber.js";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { createMarket as _createMarket } from "../market.js";
import type { Market } from "../types.js";

const BTC_FEED_ID = 1;

async function fetchBtcPrice(): Promise<number> {
  const token = process.env["PYTH_ACCESS_TOKEN"];
  if (!token)
    throw new Error("[offchain/market] PYTH_ACCESS_TOKEN env var is required");

  const client = await PythLazerClient.create({
    token,
    webSocketPoolConfig: {},
  });
  try {
    const update = await client.getLatestPrice({
      priceFeedIds: [BTC_FEED_ID],
      properties: ["price", "exponent"],
      formats: [],
      channel: "fixed_rate@200ms",
    });
    const feed = update.parsed?.priceFeeds?.[0];
    if (feed?.price === undefined || feed.exponent === undefined) {
      throw new Error("[offchain/market] no price data returned from Pyth");
    }
    return new BigNumber(feed.price).shiftedBy(feed.exponent).toNumber();
  } finally {
    client.shutdown();
  }
}

// ── MOCK ──────────────────────────────────────────────────────────────────────
let currentMarket: Market | undefined;

export async function createMarket(): Promise<Market> {
  const strikePrice = await fetchBtcPrice();
  currentMarket = _createMarket(strikePrice);
  console.log(
    `[offchain/market] created market ${currentMarket.id} strikePrice=${strikePrice}`,
  );
  return currentMarket;
}

export function getCurrentMarket(): Market | undefined {
  return currentMarket;
}
// ── END MOCK ──────────────────────────────────────────────────────────────────
