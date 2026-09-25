/**
 * scripts/generate-wallet.ts
 *
 * IntegralPayments — service wallet generator.
 *
 * Generates a new BIP-39 mnemonic seed phrase and derives the corresponding
 * Cardano addresses for Mainnet, Preprod, and Preview networks.
 *
 * The generated seed phrase is used as SERVICE_WALLET_SEED in the gateway's
 * .env file.  This wallet:
 *   - Pays transaction fees for lock transactions.
 *   - Creates the payment-request UTxOs at the validator address.
 *   - Does NOT hold merchant funds — those flow directly to merchant_address.
 *
 * SECURITY NOTICE
 * ───────────────
 * This script prints the seed phrase to stdout in plaintext.
 * In production:
 *   - Run this offline on an air-gapped machine.
 *   - Store the seed phrase in a secrets manager (e.g. HashiCorp Vault,
 *     AWS Secrets Manager) — never commit it to version control.
 *   - Fund the service wallet with a small ADA float (5–20 ADA) to cover
 *     transaction fees; it should never hold significant value.
 *
 * Usage
 * ─────
 *   npx tsx scripts/generate-wallet.ts
 *   npx tsx scripts/generate-wallet.ts --save   # append to .env.wallet (gitignored)
 */

import fs   from "node:fs";
import path from "node:path";
import {
  Lucid,
  Blockfrost,
  generateSeedPhrase,
} from "@lucid-evolution/lucid";
import "dotenv/config";
import {
  err,
  field,
  header,
  log,
  ok,
  ROOT_DIR,
  warn,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const saveToFile = process.argv.includes("--save");

  header("IntegralPayments — Service Wallet Generator");

  warn("SECURITY: Keep the seed phrase secret. Never commit it to git.");
  warn("SECURITY: This script outputs plaintext — run in a secure environment.\n");

  // 1. Generate seed phrase
  const seedPhrase = generateSeedPhrase();
  ok("BIP-39 seed phrase generated (24 words).");

  // 2. Derive addresses for all networks using a minimal Lucid instance.
  //    We use a dummy Blockfrost provider just to initialise Lucid; no
  //    network queries are made during address derivation.
  const networks: Array<{ name: string; network: "Mainnet" | "Preprod" | "Preview" }> = [
    { name: "Mainnet", network: "Mainnet"  },
    { name: "Preprod", network: "Preprod"  },
    { name: "Preview", network: "Preview"  },
  ];

  const derivedAddresses: Record<string, string> = {};

  log("Deriving addresses for all networks…");
  for (const { name, network } of networks) {
    // For address derivation we don't make any real Blockfrost calls,
    // so the API key value doesn't matter here.
    const lucid = await Lucid(
      new Blockfrost(
        `https://cardano-${name.toLowerCase()}.blockfrost.io/api/v0`,
        "dummy_key_for_address_derivation",
      ),
      network,
    );
    lucid.selectWallet.fromSeed(seedPhrase);
    const address = await lucid.wallet().address();
    derivedAddresses[name] = address;
    field(`${name} address`, address);
  }

  // 3. Extract the payment key hash (same for all networks)
  const lucidAny = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      "dummy_key_for_address_derivation",
    ),
    "Preprod",
  );
  lucidAny.selectWallet.fromSeed(seedPhrase);
  const preprodDetails = lucidAny.utils.getAddressDetails(
    derivedAddresses["Preprod"]!,
  );
  const paymentKeyHash = preprodDetails.paymentCredential?.hash ?? "unknown";
  field("Payment key hash", paymentKeyHash);

  // 4. Print the seed phrase
  header("Seed Phrase — KEEP SECRET");
  console.log(`\n  ${seedPhrase}\n`);
  warn("Write this down and store it securely. It cannot be recovered.");

  // 5. Print .env snippet
  header(".env Configuration Snippet");
  const envSnippet = [
    `# IntegralPayments service wallet — generated ${new Date().toISOString()}`,
    `SERVICE_WALLET_SEED="${seedPhrase}"`,
    `# Preprod address: ${derivedAddresses["Preprod"]}`,
    `# Mainnet address: ${derivedAddresses["Mainnet"]}`,
    ``,
    `# Fund the Preprod address:`,
    `#   https://docs.cardano.org/cardano-testnet/tools/faucet`,
    `#   (select "Preprod" and paste the address above)`,
  ].join("\n");

  console.log(envSnippet);

  // 6. Optionally save to .env.wallet
  if (saveToFile) {
    const walletEnvPath = path.join(ROOT_DIR, ".env.wallet");
    fs.writeFileSync(walletEnvPath, envSnippet + "\n");
    ok(`\nSaved to: ${walletEnvPath}`);
    warn("Make sure .env.wallet is in .gitignore — it contains your seed phrase!");

    // Verify it's gitignored
    const gitignorePath = path.join(ROOT_DIR, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, "utf8");
      if (!gitignore.includes(".env.wallet")) {
        warn(".env.wallet is NOT in .gitignore — add it immediately!");
      }
    }
  }

  // 7. Funding instructions
  header("Next Steps");
  console.log("  1. Copy SERVICE_WALLET_SEED into your .env file");
  console.log("  2. Fund the Preprod address with test ADA:");
  console.log(`     https://docs.cardano.org/cardano-testnet/tools/faucet`);
  console.log(`     Address: ${derivedAddresses["Preprod"]}`);
  console.log("  3. Verify balance:");
  console.log(`     https://preprod.cardanoscan.io/address/${derivedAddresses["Preprod"]}`);
  console.log("  4. Run deploy script once funded:");
  console.log("     npx tsx scripts/deploy.ts\n");
}

main().catch((e) => {
  err(String(e));
  process.exit(1);
});
