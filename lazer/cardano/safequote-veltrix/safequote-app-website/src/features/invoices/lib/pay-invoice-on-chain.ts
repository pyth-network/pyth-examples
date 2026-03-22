import {
  MeshTxBuilder,
  deserializeAddress,
  serializeRewardAddress,
} from "@meshsdk/core";
import type { Asset, BrowserWallet, UTxO } from "@meshsdk/core";
import type { Invoice } from "@/types/invoice";
import type { AdaUsdQuote } from "@/types/oracle";
import type { PythContext } from "@/types/pyth";
import { getInvoiceValidatorBlueprint } from "@/features/contracts/lib/blueprint";
import { buildPayRedeemer } from "@/features/invoices/lib/invoice-plutus-data";
import { createBlockfrostProvider } from "@/features/invoices/lib/provider";

function quoteRate(quote: AdaUsdQuote) {
  return Number(quote.price) * 10 ** quote.exponent;
}

function minimumLovelace(invoice: Invoice, quote: AdaUsdQuote) {
  return Math.ceil((invoice.amountUsd / quoteRate(quote)) * 1_000_000);
}

function assetQuantity(amount: Asset[], unit: string) {
  return amount.find((item) => item.unit === unit)?.quantity ?? "0";
}

function requireBuyerPubKeyHash(address: string) {
  const { pubKeyHash } = deserializeAddress(address);

  if (!pubKeyHash) {
    throw new Error("Connected wallet must expose a payment key hash");
  }

  return pubKeyHash;
}

async function getPythContext() {
  const response = await fetch("/api/pyth/context");
  const payload = (await response.json()) as { item: PythContext };
  return payload.item;
}

async function getOracleUpdate() {
  const response = await fetch("/api/oracle/ada-usd", { method: "POST" });
  const payload = (await response.json()) as { item: AdaUsdQuote };
  return payload.item;
}

async function findInvoiceScriptUtxo(invoice: Invoice): Promise<UTxO> {
  if (!invoice.invoiceScriptAddress) {
    throw new Error("Invoice is missing invoiceScriptAddress");
  }

  const provider = createBlockfrostProvider();
  const assetUnit = `${invoice.invoiceNftPolicyId}${invoice.invoiceNftName}`;
  const utxos = await provider.fetchAddressUTxOs(
    invoice.invoiceScriptAddress,
    assetUnit,
  );
  const scriptUtxo = utxos.find(
    (item) => assetQuantity(item.output.amount, assetUnit) === "1",
  );

  if (!scriptUtxo) {
    throw new Error("Invoice script UTxO was not found");
  }

  return scriptUtxo;
}

export async function payInvoiceOnChain(
  wallet: BrowserWallet,
  invoice: Invoice,
  pin: string,
) {
  const provider = createBlockfrostProvider();
  const utxos = await wallet.getUtxos();
  const collateral = await wallet.getCollateral();
  const buyerAddress = await wallet.getChangeAddress();

  if (!collateral[0]) {
    throw new Error("A collateral UTxO is required to use Plutus scripts");
  }

  const [oracle, pythContext, scriptUtxo] = await Promise.all([
    getOracleUpdate(),
    getPythContext(),
    findInvoiceScriptUtxo(invoice),
  ]);

  const minLovelace = minimumLovelace(invoice, oracle);
  const invoiceBlueprint = getInvoiceValidatorBlueprint();
  const rewardAddress = serializeRewardAddress(
    pythContext.withdrawScriptHash,
    true,
    Number(process.env.NEXT_PUBLIC_CARDANO_NETWORK_ID ?? "0") as 0 | 1,
  );
  const invoiceRedeemer = buildPayRedeemer(buyerAddress, pin);
  const buyerPubKeyHash = requireBuyerPubKeyHash(buyerAddress);
  const invoiceUnit = `${invoice.invoiceNftPolicyId}${invoice.invoiceNftName}`;

  const unsignedTx = await new MeshTxBuilder({
    fetcher: provider,
    verbose: true,
  })
    .spendingPlutusScriptV3()
    .txIn(
      scriptUtxo.input.txHash,
      scriptUtxo.input.outputIndex,
      scriptUtxo.output.amount,
      scriptUtxo.output.address,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(invoiceRedeemer, "JSON")
    .txInScript(invoiceBlueprint.cbor)
    .readOnlyTxInReference(
      pythContext.stateTxHash,
      pythContext.stateOutputIndex,
    )
    .withdrawalPlutusScriptV3()
    .withdrawal(String(rewardAddress), "0")
    .withdrawalRedeemerValue([{ bytes: oracle.binary }], "JSON")
    .requiredSignerHash(buyerPubKeyHash)
    .txOut(invoice.sellerAddress, [
      { unit: "lovelace", quantity: String(minLovelace) },
    ])
    .txOut(buyerAddress, [
      { unit: "lovelace", quantity: "2000000" },
      { unit: invoiceUnit, quantity: "1" },
    ])
    .changeAddress(buyerAddress)
    .selectUtxosFrom(utxos)
    .txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address,
    )
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);

  return {
    txHash,
    minLovelace,
    quote: oracle,
    buyerAddress,
  };
}
