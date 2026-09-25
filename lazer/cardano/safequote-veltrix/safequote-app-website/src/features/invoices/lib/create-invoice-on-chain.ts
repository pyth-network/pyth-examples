import { MeshTxBuilder } from "@meshsdk/core";
import type { BrowserWallet } from "@meshsdk/core";
import type { Invoice } from "@/types/invoice";
import {
  getInvoiceMintBlueprint,
  getInvoiceValidatorBlueprint,
} from "@/features/contracts/lib/blueprint";
import {
  buildInvoiceDatum,
  buildMintRedeemer,
} from "@/features/invoices/lib/invoice-plutus-data";
import { textToHex } from "@/features/invoices/lib/encoding";
import { createBlockfrostProvider } from "@/features/invoices/lib/provider";
import { hashPin } from "@/features/invoices/lib/pin";

interface CreateInvoiceInput {
  sellerAddress: string;
  clientName: string;
  concept: string;
  amountUsd: number;
  pin: string;
  deadline: string;
}

interface CreateInvoiceResult {
  invoice: Invoice;
  txHash: string;
}

export async function createInvoiceOnChain(
  wallet: BrowserWallet,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const provider = createBlockfrostProvider();
  const utxos = await wallet.getUtxos();
  const collateral = await wallet.getCollateral();
  const changeAddress = await wallet.getChangeAddress();

  if (!collateral[0]) {
    throw new Error("A collateral UTxO is required to use Plutus scripts");
  }

  if (!utxos[0]) {
    throw new Error("Wallet has no spendable UTxOs");
  }

  const mintBlueprint = getInvoiceMintBlueprint();
  const invoiceBlueprint = getInvoiceValidatorBlueprint();
  const now = new Date().toISOString();
  const invoiceNftLabel = `invoice-${Date.now()}`;
  const invoiceNftName = textToHex(invoiceNftLabel);

  const invoice: Invoice = {
    id: crypto.randomUUID(),
    sellerAddress: input.sellerAddress,
    clientName: input.clientName,
    concept: input.concept,
    amountUsd: input.amountUsd,
    pinHash: hashPin(input.pin),
    invoiceNftPolicyId: mintBlueprint.hash,
    invoiceNftName,
    invoiceScriptAddress: invoiceBlueprint.address,
    status: "open",
    deadline: input.deadline,
    createdAt: now,
    updatedAt: now,
  };

  const datum = buildInvoiceDatum(invoice);
  const mintRedeemer = buildMintRedeemer(input.sellerAddress, {
    txHash: utxos[0].input.txHash,
    outputIndex: utxos[0].input.outputIndex,
  });

  const unsignedTx = await new MeshTxBuilder({
    fetcher: provider,
    verbose: true,
  })
    .mintPlutusScriptV3()
    .mint("1", mintBlueprint.hash, invoice.invoiceNftName)
    .mintingScript(mintBlueprint.cbor)
    .mintRedeemerValue(mintRedeemer, "JSON")
    .metadataValue(721, {
      [mintBlueprint.hash]: {
        [invoiceNftLabel]: {
          name: invoiceNftLabel,
          client: input.clientName,
          concept: input.concept,
          amountUsd: input.amountUsd,
          deadline: input.deadline,
        },
      },
    })
    .txOut(invoiceBlueprint.address, [
      { unit: "lovelace", quantity: "2000000" },
      { unit: `${mintBlueprint.hash}${invoice.invoiceNftName}`, quantity: "1" },
    ])
    .txOutInlineDatumValue(datum, "JSON")
    .changeAddress(changeAddress)
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
    invoice: {
      ...invoice,
      lockTxHash: txHash,
      lockTxIndex: 0,
    },
    txHash,
  };
}
