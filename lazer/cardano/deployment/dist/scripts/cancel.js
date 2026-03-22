import { paymentCredentialOf } from "@lucid-evolution/lucid";
import { loadConfig, initLucid } from "../config.js";
import { buildValidator } from "../validator.js";
import { cancel } from "../transactions/cancel.js";
async function main() {
    const usdAmountCents = BigInt(process.argv[2] ?? "1000");
    const userAddress = process.argv[3];
    if (!userAddress) {
        console.error("Usage: tsx src/scripts/cancel.ts <usd_cents> <user_bech32_address>");
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
    console.log("Building cancel transaction...");
    const txHash = await cancel(lucid, config, { validator });
    console.log(`Cancel transaction submitted: ${txHash}`);
}
main().catch(console.error);
