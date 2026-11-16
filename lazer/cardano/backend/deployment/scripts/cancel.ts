import { executeCancelFlow } from "../services/cancelFlow.js";

async function main() {
  const usdAmountCents = BigInt(process.argv[2] ?? "1000");
  const userAddress = process.argv[3];

  if (!userAddress) {
    console.error(
      "Usage: tsx src/scripts/cancel.ts <usd_cents> <user_bech32_address>",
    );
    process.exit(1);
  }

  console.log("Building cancel transaction...");

  const cancelResult = await executeCancelFlow({
    usdAmountCents,
    userAddress,
  });

  console.log(`Cancel transaction submitted: ${cancelResult.txHash}`);
}

main().catch(console.error);
