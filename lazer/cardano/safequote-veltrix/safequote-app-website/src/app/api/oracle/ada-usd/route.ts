import { NextResponse } from "next/server";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

export async function POST() {
  const token = process.env.PYTH_ACCESS_TOKEN;
  const feedId = Number(process.env.PYTH_LAZER_ADA_USD_FEED_ID ?? "16");

  if (!token) {
    return NextResponse.json(
      { message: "Missing PYTH_ACCESS_TOKEN configuration" },
      { status: 500 },
    );
  }

  const client = await PythLazerClient.create({
    token,
    webSocketPoolConfig: {
      urls: [
        "wss://pyth-lazer-0.dourolabs.app/v1/stream",
        "wss://pyth-lazer-1.dourolabs.app/v1/stream",
        "wss://pyth-lazer-2.dourolabs.app/v1/stream",
      ],
    },
  });

  try {
    const update = await client.getLatestPrice({
      channel: "fixed_rate@200ms",
      formats: ["solana"],
      jsonBinaryEncoding: "hex",
      priceFeedIds: [feedId],
      properties: ["price", "exponent"],
    });

    const parsed = update.parsed;
    const priceFeed = parsed?.priceFeeds?.[0];
    const binary = update.solana?.data;

    if (!parsed || !priceFeed || !binary) {
      return NextResponse.json(
        { message: "Incomplete response from Pyth Lazer" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        item: {
          feedId: priceFeed.priceFeedId,
          price: priceFeed.price,
          exponent: priceFeed.exponent,
          timestampUs: parsed.timestampUs,
          binary,
        },
      },
      { status: 200 },
    );
  } finally {
    client.shutdown();
  }
}
