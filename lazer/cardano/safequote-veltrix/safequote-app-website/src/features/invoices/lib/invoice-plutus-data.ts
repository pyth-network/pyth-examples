import { deserializeAddress } from "@meshsdk/core";
import type { Invoice } from "@/types/invoice";
import { pinToBytesHex } from "@/features/invoices/lib/pin";

function requiredPubKeyHash(address: string) {
  const { pubKeyHash } = deserializeAddress(address);

  if (!pubKeyHash) {
    throw new Error("Expected a payment key hash address");
  }

  return pubKeyHash;
}

export function buildInvoiceDatum(invoice: Invoice) {
  const pythPolicyId = process.env.NEXT_PUBLIC_PYTH_PREPROD_POLICY_ID;

  if (!pythPolicyId) {
    throw new Error("Missing NEXT_PUBLIC_PYTH_PREPROD_POLICY_ID");
  }

  return {
    alternative: 0,
    fields: [
      { bytes: requiredPubKeyHash(invoice.sellerAddress) },
      { int: String(Math.round(invoice.amountUsd * 100)) },
      { bytes: pythPolicyId },
      { bytes: invoice.pinHash },
      { bytes: invoice.invoiceNftPolicyId },
      { bytes: invoice.invoiceNftName },
      { int: String(Date.parse(invoice.deadline)) },
    ],
  };
}

export function buildPayRedeemer(buyerAddress: string, pin: string) {
  return {
    alternative: 0,
    fields: [
      { bytes: requiredPubKeyHash(buyerAddress) },
      { bytes: pinToBytesHex(pin) },
    ],
  };
}

export function buildMintRedeemer(
  sellerAddress: string,
  utxoRef: { txHash: string; outputIndex: number },
) {
  return {
    alternative: 0,
    fields: [
      { bytes: requiredPubKeyHash(sellerAddress) },
      {
        alternative: 0,
        fields: [
          { bytes: utxoRef.txHash },
          { int: String(utxoRef.outputIndex) },
        ],
      },
    ],
  };
}
