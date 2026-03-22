import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

import { lazerChannelForFeedId } from "./feeds.js";

/** Pyth Lazer governance policy on Cardano PreProd (same as lazer-rwa). */
export const PYTH_POLICY_ID_HEX =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

export async function fetchSolanaFormatUpdate(
  accessToken: string,
  priceFeedIds: number[],
): Promise<Buffer> {
  const channels = [...new Set(priceFeedIds.map(lazerChannelForFeedId))];
  if (channels.length !== 1) {
    throw new Error(
      "Pyth Lazer: varios canales en un solo update — pasá un solo feedId por tx o ampliá el builder",
    );
  }
  const channel = channels[0]!;
  const lazer = await PythLazerClient.create({ token: accessToken });
  const latest = await lazer.getLatestPrice({
    channel,
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds,
    properties: ["price", "bestBidPrice", "bestAskPrice", "exponent"],
  });
  if (!latest.solana?.data) {
    throw new Error("Pyth Lazer: missing solana-format payload");
  }
  return Buffer.from(latest.solana.data, "hex");
}
