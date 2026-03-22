/**
 * Test script: mint an invoice NFT on PreProd.
 *
 * Usage: npx tsx src/test-mint.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MeshTxBuilder,
  KoiosProvider,
  mConStr0,
  resolveScriptHash,
  applyParamsToScript,
} from "@meshsdk/core";
import * as CML from "@anastasia-labs/cardano-multiplatform-lib-nodejs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINT_PATH = path.resolve(__dirname, "../../contracts/plutus.json");
const ADDR = "addr_test1qpwmyvn3dkslusdhvq9lcae74qp7tn5qhnnzj4uc6dwjx7u64ztv4uur4qn0g8nekj2smva6xz2xj59vf0tc2gyy5u6sdhuckv";
const PKH = "5db232716da1fe41b7600bfc773ea003e5ce80bce6295798d35d237b";

async function main() {
  const bp = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, "utf-8"));
  const demo = bp.validators.find((v: any) => v.title === "invoice_mint_demo.invoice_mint_demo.mint");
  const mintScript = applyParamsToScript(demo.compiledCode, []);
  const policyId = resolveScriptHash(mintScript, "V3");
  console.log("Policy ID:", policyId);

  const provider = new KoiosProvider("preprod");
  const utxos = await provider.fetchAddressUTxOs(ADDR);
  console.log("UTxOs:", utxos.length);

  // Pick a UTxO for collateral (one with only lovelace, no tokens)
  const collateralUtxo = utxos.find((u: any) =>
    Object.keys(u.output.amount).length === 1 ||
    (u.output.amount.length === 1 && u.output.amount[0].unit === "lovelace")
  );
  console.log("Collateral UTxO:", collateralUtxo ? `${collateralUtxo.input.txHash.slice(0, 16)}...#${collateralUtxo.input.outputIndex}` : "NONE");

  const invoiceId = "494e56" + Date.now().toString(16);

  const txBuilder = new MeshTxBuilder({ fetcher: provider, evaluator: provider });
  let builder = txBuilder
    .mintPlutusScriptV3()
    .mint("1", policyId, invoiceId)
    .mintingScript(mintScript)
    .mintRedeemerValue(mConStr0([]))
    .txOut(ADDR, [
      { unit: "lovelace", quantity: "2000000" },
      { unit: policyId + invoiceId, quantity: "1" },
    ])
    .requiredSignerHash(PKH)
    .changeAddress(ADDR)
    .selectUtxosFrom(utxos)
    .setNetwork("preprod");

  // Add collateral
  if (collateralUtxo) {
    builder = builder.txInCollateral(
      collateralUtxo.input.txHash,
      collateralUtxo.input.outputIndex,
      collateralUtxo.output.amount,
      collateralUtxo.output.address,
    );
  }

  const unsignedTx = await builder.complete();
  console.log("Tx built:", unsignedTx.length / 2, "bytes");

  // Evaluate via Ogmios to check if script passes
  const evalRes = await fetch("https://preprod.koios.rest/api/v1/ogmios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "evaluateTransaction",
      params: { transaction: { cbor: unsignedTx } },
    }),
  });
  const evalResult = await evalRes.json();
  if (evalResult.result) {
    console.log("EVALUATION PASSED!", JSON.stringify(evalResult.result));
  } else {
    console.log("EVALUATION FAILED:", JSON.stringify(evalResult.error?.data?.[0]?.error?.data || evalResult.error?.message).slice(0, 300));
    return;
  }

  // Try submitting directly (unsigned, just to see if Koios accepts the structure)
  console.log("\nTx is valid! To submit, sign with wallet and post to /api/v1/submittx");
  console.log("Tx hex (first 80):", unsignedTx.slice(0, 80));
}

main().catch(console.error);
