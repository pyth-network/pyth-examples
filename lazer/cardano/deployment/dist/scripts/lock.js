import { paymentCredentialOf } from "@lucid-evolution/lucid";
import { loadConfig, initLucid } from "../config.js";
import { buildValidator } from "../validator.js";
import { lock } from "../transactions/lock.js";
async function main() {
    const usdAmountCents = BigInt(process.argv[2] ?? "1000"); // default $10.00
    const userAddress = process.argv[3];
    const lovelaceToLock = BigInt(process.argv[4] ?? "30000000"); // default 30 ADA
    if (!userAddress) {
        console.error("Usage: tsx src/scripts/lock.ts <usd_cents> <user_bech32_address> [lovelace_to_lock]");
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
    console.log("Building lock transaction...");
    console.log(`  USD amount: $${Number(usdAmountCents) / 100}`);
    console.log(`  Lovelace to lock: ${lovelaceToLock}`);
    const txHash = await lock(lucid, config, {
        validator,
        lovelaceAmount: lovelaceToLock,
    });
    console.log(`Lock transaction submitted: ${txHash}`);
}
main().catch(console.error);
