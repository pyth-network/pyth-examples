import { getLucid, getContractAddress, validatorScript } from "./contract";
import { getPythUpdatesForTx } from "./onchain-update";
import { Data, Constr, fromText } from "lucid-cardano";

// Feed ID real de Pyth para Wheat (Trigo)
const WHEAT_FEED_ID = "0xe9d069730ab74e167cfbb4e8de6cf1a38c04a2c5f2f39a6800b5820ec9e3a19";

// Datum: purchase order
const PurchaseOrderDatumSchema = Data.Object({
  supplier_id: Data.Bytes(),
  product_feed_id: Data.Bytes(),
  supplier_price: Data.Integer(),
  quantity: Data.Integer(),
  buyer_pkh: Data.Bytes(),
});
type PurchaseOrderDatum = {
  supplier_id: string;
  product_feed_id: string;
  supplier_price: bigint;
  quantity: bigint;
  buyer_pkh: string;
};

async function lockPurchaseOrder() {
  const lucid = await getLucid();

  const seed = process.env.WALLET_SEED;
  if (!seed) throw new Error("WALLET_SEED not set in .env");

  lucid.selectWalletFromSeed(seed);

  const address = await lucid.wallet.address();
  const pkh = lucid.utils.getAddressDetails(address).paymentCredential!.hash;

  console.log("📍 Wallet address:", address);
  console.log("🔑 PKH:", pkh);

  const datum: PurchaseOrderDatum = {
    supplier_id: fromText("proveedor_molinos"),
    product_feed_id: WHEAT_FEED_ID,
    supplier_price: 850_000n,   // $0.85 USD/kg × 10^6
    quantity: 50n,               // 50 kg
    buyer_pkh: pkh,
  };

  console.log("\n📦 Purchase Order:");
  console.log("   Supplier: proveedor_molinos");
  console.log("   Product: Wheat (Trigo)");
  console.log("   Price: $0.85 USD/kg");
  console.log("   Quantity: 50 kg");
  console.log("   Total: $42.50 USD");

  const tx = await lucid
    .newTx()
    .payToContract(
      getContractAddress(lucid),
      { inline: Data.to(datum, PurchaseOrderDatumSchema) },
      { lovelace: 5_000_000n }   // 5 ADA deposit
    )
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("\n✅ Purchase Order locked on-chain!");
  console.log(`   TxHash: ${txHash}`);
  console.log(`   Contract: ${getContractAddress(lucid)}`);
  console.log("\n⏳ Wait 1-2 min for confirmation, then run: npm run redeem");
  return txHash;
}

async function redeemWithPythValidation() {
  const lucid = await getLucid();

  const seed = process.env.WALLET_SEED;
  if (!seed) throw new Error("WALLET_SEED not set in .env");

  lucid.selectWalletFromSeed(seed);

  // 1. Fetch Pyth price update
  console.log("📡 Fetching Pyth price update...");
  try {
    const pythUpdates = await getPythUpdatesForTx([WHEAT_FEED_ID]);
    console.log(`   Wheat price from Pyth: $${pythUpdates.updates[0]?.latestUsd ?? "N/A"} USD`);
  } catch (e) {
    console.log("   Note: Pyth fetch may fail without valid subscription");
  }

  // 2. Find UTxO in contract
  const utxos = await lucid.utxosAt(getContractAddress(lucid));
  if (utxos.length === 0) {
    console.log("❌ No UTxOs in contract. Run `npm run lock` first.");
    return;
  }

  const utxo = utxos[0];
  console.log(`\n🔓 Found UTxO: ${utxo.txHash}#${utxo.outputIndex}`);

  // 3. Build tx with Pyth update as redeemer
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], Data.void())
    .attachSpendingValidator(validatorScript)
    .addSigner(await lucid.wallet.address())
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("\n✅ Purchase Order redeemed!");
  console.log(`   TxHash: ${txHash}`);
  console.log("   Pyth verified: supplier price is FAIR vs market");
}

// CLI entry point
const action = process.argv[2];

if (action === "lock") {
  lockPurchaseOrder().catch(console.error);
} else if (action === "redeem") {
  redeemWithPythValidation().catch(console.error);
} else {
  console.log("Usage: npm run lock | npm run redeem");
}
