import { config as loadEnv } from "dotenv";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

loadEnv({ path: ".env.local" });

async function main() {
  const token = process.env.PYTH_ACCESS_TOKEN;
  const feedId = Number(process.env.PYTH_LAZER_ADA_USD_FEED_ID ?? "16");

  if (!token) {
    throw new Error("Missing PYTH_ACCESS_TOKEN in .env.local");
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
    const latestPrice = await client.getLatestPrice({
      channel: "fixed_rate@200ms",
      formats: ["solana"],
      jsonBinaryEncoding: "hex",
      priceFeedIds: [feedId],
      properties: ["price", "exponent"],
    });

    console.log(JSON.stringify(latestPrice, null, 2));
  } finally {
    client.shutdown();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});