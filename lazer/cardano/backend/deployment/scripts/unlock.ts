import { Address, createClient } from "@evolution-sdk/evolution";
import { paymentCredentialOf } from "@lucid-evolution/lucid";
import { loadConfig } from "../config.js";
import { buildValidator } from "../validator.js";
import { unlock } from "../transactions/unlock.js";

function toEvolutionNetwork(network: "Preprod" | "Mainnet"): "preprod" | "mainnet" {
  return network === "Mainnet" ? "mainnet" : "preprod";
}

function requirePaymentCredentialHash(address: string): string {
  if (address.startsWith("addr")) {
    return paymentCredentialOf(address).hash;
  }

  const details = Address.getAddressDetails(address);
  if (!details) {
    throw new Error("Address must be bech32 or hex bytes.");
  }
  const rawAddress = Buffer.from(details.address.hex, "hex");
  return rawAddress.subarray(1, 29).toString("hex");
}

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
  const client = createClient({
    network: toEvolutionNetwork(config.network),
    provider: {
      type: "blockfrost",
      baseUrl: config.blockfrostUrl,
      projectId: config.blockfrostProjectId,
    },
  }).attachWallet({
    type: "seed",
    mnemonic: config.sponsorSeedPhrase,
  });

  const sponsorAddress = Address.toBech32(await client.address());
  const details = Address.getAddressDetails(userAddress);
  if (!details) {
    throw new Error("User address must be a valid bech32 or hex Cardano address.");
  }
  const normalizedUserAddress = details.address.bech32;
  const sponsorPaymentKeyHash = requirePaymentCredentialHash(sponsorAddress);
  const userPaymentKeyHash = requirePaymentCredentialHash(userAddress);

  const validator = buildValidator({
    usdAmountCents,
    userPaymentKeyHash,
    sponsorPaymentKeyHash,
    pythPolicyId: config.pythPolicyId,
  });

  console.log("Building unlock transaction...");
  console.log(`  USD amount: $${Number(usdAmountCents) / 100}`);
  console.log("  Fetching Pyth oracle price...");

  const txHash = await unlock(client as any, config, {
    validator,
    usdAmountCents,
    userAddress: normalizedUserAddress,
    sponsorAddress,
  });

  console.log(`Unlock transaction submitted: ${txHash}`);
}

main().catch(console.error);
