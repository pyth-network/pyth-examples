import type { AdaUsdQuote } from "@/types/oracle";
import type { Invoice } from "@/types/invoice";

export interface PayInvoiceArgs {
  invoice: Invoice;
  quote: AdaUsdQuote;
  walletAddress: string;
}

export interface PaymentPreview {
  invoiceId: string;
  walletAddress: string;
  quoteFeedId: number;
  quotePrice: string;
  quoteBinarySize: number;
  quoteRateUsd: number;
  expectedAda: number;
  expectedLovelace: number;
  txHash: string;
  nextSteps: string[];
}

function quoteToUsdRate(quote: AdaUsdQuote) {
  return Number(quote.price) * 10 ** quote.exponent;
}

export async function payInvoice({
  invoice,
  quote,
  walletAddress,
}: PayInvoiceArgs) {
  const quoteRateUsd = quoteToUsdRate(quote);
  const expectedAda = invoice.amountUsd / quoteRateUsd;
  const expectedLovelace = Math.ceil(expectedAda * 1_000_000);
  const txHash = `demo_${invoice.id}_${Date.now()}`;

  return {
    invoiceId: invoice.id,
    walletAddress,
    quoteFeedId: quote.feedId,
    quotePrice: quote.price,
    quoteBinarySize: quote.binary.length,
    quoteRateUsd,
    expectedAda,
    expectedLovelace,
    txHash,
    nextSteps: [
      "Load the invoice datum and expected lovelace amount.",
      "Attach the latest signed Pyth ADA/USD update.",
      "Reference the Pyth state UTxO in preprod.",
      "Build the pay transaction and lock funds at the invoice script.",
    ],
  } satisfies PaymentPreview;
}
