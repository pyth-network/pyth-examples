/**
 * Deploy validators as reference scripts on PreProd.
 *
 * Generates unsigned transactions that you sign in the browser wallet.
 * Uses Koios as provider (no API key needed).
 *
 * Usage: npx tsx src/deploy.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Lucid,
  Koios,
  applyParamsToScript,
  validatorToScriptHash,
  validatorToAddress,
} from "@lucid-evolution/lucid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINT_PATH = path.resolve(__dirname, "../../contracts/plutus.json");
const CONFIG_PATH = path.resolve(__dirname, "../deploy-config.json");

const WALLET_ADDRESS =
  "addr_test1qpwmyvn3dkslusdhvq9lcae74qp7tn5qhnnzj4uc6dwjx7u64ztv4uur4qn0g8nekj2smva6xz2xj59vf0tc2gyy5u6sdhuckv";

async function main() {
  const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, "utf-8"));

  // --- Compute all hashes and parameterized scripts ---

  const escrowValidator = blueprint.validators.find(
    (v: any) => v.title === "escrow.escrow.spend",
  );
  const invoiceMintValidator = blueprint.validators.find(
    (v: any) => v.title === "invoice_mint.invoice_mint.mint",
  );
  const marketplaceValidator = blueprint.validators.find(
    (v: any) => v.title === "marketplace.marketplace.spend",
  );

  const escrowHash = validatorToScriptHash({
    type: "PlutusV3",
    script: escrowValidator.compiledCode,
  });
  const invoiceMintScript = applyParamsToScript(
    invoiceMintValidator.compiledCode,
    [escrowHash],
  );
  const invoiceMintPolicyId = validatorToScriptHash({
    type: "PlutusV3",
    script: invoiceMintScript,
  });
  const marketplaceScript = applyParamsToScript(
    marketplaceValidator.compiledCode,
    [invoiceMintPolicyId, escrowHash],
  );
  const marketplaceHash = validatorToScriptHash({
    type: "PlutusV3",
    script: marketplaceScript,
  });
  const escrowAddr = validatorToAddress("Preprod", {
    type: "PlutusV3",
    script: escrowValidator.compiledCode,
  });
  const marketplaceAddr = validatorToAddress("Preprod", {
    type: "PlutusV3",
    script: marketplaceScript,
  });

  console.log("=== Factura Ya — Deploy Config ===\n");
  console.log("Escrow hash:        ", escrowHash);
  console.log("Invoice mint policy:", invoiceMintPolicyId);
  console.log("Marketplace hash:   ", marketplaceHash);
  console.log("Escrow address:     ", escrowAddr);
  console.log("Marketplace address:", marketplaceAddr);

  // --- Save config ---

  const config = {
    escrow: {
      scriptHash: escrowHash,
      script: escrowValidator.compiledCode,
      address: escrowAddr,
    },
    invoiceMint: {
      policyId: invoiceMintPolicyId,
      script: invoiceMintScript,
    },
    marketplace: {
      scriptHash: marketplaceHash,
      script: marketplaceScript,
      address: marketplaceAddr,
    },
    pythPolicyId:
      "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6",
    network: "preprod",
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`\nConfig saved to ${CONFIG_PATH}`);

  // --- Build unsigned deploy tx ---

  console.log("\n=== Building unsigned deploy transaction ===\n");

  const lucid = await Lucid(
    new Koios("https://preprod.koios.rest/api/v1"),
    "Preprod",
  );
  lucid.selectWallet.fromAddress(WALLET_ADDRESS);

  // Single tx that stores all 3 scripts as reference scripts
  const tx = await lucid
    .newTx()
    .pay.ToAddressWithData(
      WALLET_ADDRESS,
      { kind: "inline", value: "d87980" },
      { lovelace: 10_000_000n },
      { type: "PlutusV3", script: escrowValidator.compiledCode },
    )
    .pay.ToAddressWithData(
      WALLET_ADDRESS,
      { kind: "inline", value: "d87980" },
      { lovelace: 15_000_000n },
      { type: "PlutusV3", script: invoiceMintScript },
    )
    .pay.ToAddressWithData(
      WALLET_ADDRESS,
      { kind: "inline", value: "d87980" },
      { lovelace: 15_000_000n },
      { type: "PlutusV3", script: marketplaceScript },
    )
    .complete();

  const unsignedCbor = tx.toCBOR();

  // Save unsigned tx
  const txPath = path.resolve(__dirname, "../deploy-tx-unsigned.cbor");
  fs.writeFileSync(txPath, unsignedCbor);

  console.log(`Unsigned tx saved to: ${txPath}`);
  console.log(`Tx size: ${unsignedCbor.length / 2} bytes`);
  console.log(`\nCost: ~40 ADA (3 reference script UTxOs + fees)`);
  console.log(`\nTo sign and submit, open the deploy page in the browser.`);
}

main().catch(console.error);
