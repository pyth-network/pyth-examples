import type { NextApiRequest, NextApiResponse } from "next";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

type PythLazerPricesResponse =
  | {
      signedUpdateHex: string;
      parsedPrices: Array<{ feedId: number; price: number; exponent: number }>;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PythLazerPricesResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { feedIds } = req.body ?? {};
  if (!Array.isArray(feedIds) || feedIds.length === 0) {
    return res.status(400).json({ error: "feedIds must be a non-empty array of numbers" });
  }

  const pythToken = process.env.PYTH_TOKEN;
  if (!pythToken) {
    return res.status(500).json({ error: "Missing PYTH_TOKEN env var" });
  }

  let client: InstanceType<typeof PythLazerClient> | null = null;
  try {
    client = await PythLazerClient.create({ token: pythToken, webSocketPoolConfig: {} });

    const resp = await client.getLatestPrice({
      priceFeedIds: feedIds as number[],
      properties: ["price", "exponent"],
      channel: "fixed_rate@200ms",
      formats: ["solana"],
      jsonBinaryEncoding: "hex",
      parsed: true,
    });

    if (!resp.solana?.data) {
      throw new Error("No Lazer signed update in response");
    }

    const parsedPrices = (resp.parsed?.priceFeeds ?? []).map(
      (f: { priceFeedId: unknown; price: unknown; exponent: unknown }) => ({
        feedId: Number(f.priceFeedId),
        price: Number(f.price),   // SDK returns string — must be Number() for Plutus integer encoding
        exponent: Number(f.exponent),
      }),
    );

    return res.status(200).json({
      signedUpdateHex: resp.solana.data as string,
      parsedPrices,
    });
  } catch (err) {
    console.error("[pyth-lazer-prices] error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch Pyth Lazer prices";
    return res.status(500).json({ error: message });
  } finally {
    client?.shutdown();
  }
}
