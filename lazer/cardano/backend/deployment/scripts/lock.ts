import { executeLockFlow } from "../services/lockFlow.js";

async function main() {
  const usdAmountCents = BigInt(process.argv[2] ?? "1000"); // default $10.00
  const userAddress = process.argv[3];
  const lovelaceToLock = BigInt(process.argv[4] ?? "30000000"); // default 30 ADA

  if (!userAddress) {
    console.error(
      "Usage: tsx src/scripts/lock.ts <usd_cents> <user_bech32_address> [lovelace_to_lock]",
    );
    process.exit(1);
  }

  console.log("Building lock transaction...");
  console.log(`  USD amount: $${Number(usdAmountCents) / 100}`);
  console.log(`  Lovelace to lock: ${lovelaceToLock}`);

  const lockResult = await executeLockFlow({
    usdAmountCents,
    userAddress,
    lovelaceToLock,
  });

  console.log(`Lock transaction submitted: ${lockResult.txHash}`);
}

main().catch(console.error);
