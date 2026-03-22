import { Lucid, Blockfrost, Data } from "lucid-cardano";
import { getPythUpdatesForTx } from "./onchain-update";

// Validator address (se genera con `aiken build`)
const VALIDATOR_ADDRESS = "addr_test1..."; // TODO: Replace with actual address

/**
 * Submit a purchase order transaction to Cardano with Pyth price verification
 */
export async function submitPurchaseOrder(
  supplierPrice: number,
  feedId: string,
  quantity: number,
  blockfrostKey: string
) {
  const lucid = await Lucid.new(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", blockfrostKey),
    "Preprod"
  );

  // 1. Fetch Pyth updates firmados
  const pythUpdates = await getPythUpdatesForTx([feedId]);

  // 2. Construir datum
  const datum = Data.to({
    supplier_id: "proveedor_a",
    product_feed_id: feedId,
    supplier_price: BigInt(supplierPrice * 1_000_000),
    quantity: BigInt(quantity),
    buyer_pkh: lucid.utils.getAddressDetails(
      await lucid.wallet.address()
    ).paymentCredential?.hash!,
  });

  // 3. Buildear tx con Pyth updates como redeemer
  // TODO: Load validator from plutus.json
  const tx = await lucid
    .newTx()
    .payToContract(VALIDATOR_ADDRESS, { inline: datum }, { lovelace: 2_000_000n })
    .complete();

  const signed = await tx.sign().complete();
  return signed.submit();
}

/**
 * Query current Pyth price for a commodity without submitting transaction
 */
export async function getCurrentPrice(feedId: string): Promise<number> {
  const updates = await getPythUpdatesForTx([feedId]);
  // Extract price from update
  return 0; // TODO: Implement
}
