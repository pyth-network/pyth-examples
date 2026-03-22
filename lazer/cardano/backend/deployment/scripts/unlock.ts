import { paymentCredentialOf } from "@lucid-evolution/lucid";
import { loadConfig, initLucid } from "../config.js";
import { buildValidator } from "../validator.js";
import { unlock } from "../transactions/unlock.js";

async function main() {
  const usdAmountCents = BigInt(process.argv[2] ?? "1000");
  const userAddress = process.argv[3];

  if (!userAddress) {
    console.error(
      "Usage: tsx src/scripts/unlock.ts <usd_cents> <user_bech32_address>",
    );
    process.exit(1);
  }

  const config = loadConfig();
  const lucid = await initLucid(config);

  const sponsorAddress = await lucid.wallet().address();
  const sponsorCred = paymentCredentialOf(sponsorAddress);
  const userCred = paymentCredentialOf(userAddress);

  const validator = buildValidator({
    usdAmountCents,
    userPaymentKeyHash: userCred.hash,
    sponsorPaymentKeyHash: sponsorCred.hash,
    pythPolicyId: config.pythPolicyId,
  });

  console.log("Building unlock transaction...");
  console.log(`  USD amount: $${Number(usdAmountCents) / 100}`);
  console.log("  Fetching Pyth oracle price...");

  const txHash = await unlock(lucid, config, { validator });

  console.log(`Unlock transaction submitted: ${txHash}`);
}

main().catch(console.error);
