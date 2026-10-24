import { EventEmitter } from "node:events";
import BigNumber from "bignumber.js";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import type { PriceTick } from "../types.js";

const BTC_FEED_ID = 1;

interface CurrentPrice {
  raw: string;
  exponent: number;
  num: number; // pre-computed float, used by the mock orderbook
}

export async function createBtcPriceStream(): Promise<{
  emitter: EventEmitter;
  getPrice: () => number | undefined;
}> {
  const token = process.env["PYTH_ACCESS_TOKEN"];
  if (!token)
    throw new Error("[btcPrice] PYTH_ACCESS_TOKEN env var is required");

  const emitter = new EventEmitter();
  let current: CurrentPrice | undefined;

  // TODO: Once the settlement contract is wired, switch to a verified feed:
  //   formats: ["evm"], deliveryFormat: "binary"
  //   and pass the signed payload to the contract for on-chain price validation.
  const client = await PythLazerClient.create({
    token,
    webSocketPoolConfig: {},
  });

  client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: [BTC_FEED_ID],
    properties: ["price", "exponent", "feedUpdateTimestamp"],
    formats: [],
    deliveryFormat: "json",
    channel: "fixed_rate@200ms",
  });

  client.addMessageListener((event) => {
    if (event.type !== "json") return;
    if (event.value.type !== "streamUpdated") return;
    const feed = event.value.parsed?.priceFeeds?.[0];
    if (
      feed?.price === undefined ||
      feed.exponent === undefined ||
      feed.feedUpdateTimestamp === undefined
    )
      return;

    const bn = new BigNumber(feed.price).shiftedBy(feed.exponent);
    current = {
      raw: feed.price,
      exponent: feed.exponent,
      num: bn.toNumber(),
    };

    const tick: PriceTick = {
      timestamp: feed.feedUpdateTimestamp / 1000, // µs → ms
      btcPriceStr: bn.toFixed(2),
      btcPriceRaw: feed.price,
      exponent: feed.exponent,
    };
    emitter.emit("tick", tick);
  });

  console.log("[btcPrice] Pyth Lazer connected, subscribed to BTC/USD feed");
  return { emitter, getPrice: () => current?.num };
}
