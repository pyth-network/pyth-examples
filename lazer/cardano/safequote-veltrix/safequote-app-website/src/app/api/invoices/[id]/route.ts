import { NextResponse } from "next/server";
import { findInvoiceById } from "@/features/invoices/lib/invoice-store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const invoice = findInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    buyerAddress?: string;
    adaQuoteSnapshot?: number;
    feedId?: number;
    txHash?: string;
    status?: "open" | "paid" | "expired";
  };

  Object.assign(invoice, {
    buyerAddress: body.buyerAddress ?? invoice.buyerAddress,
    adaQuoteSnapshot: body.adaQuoteSnapshot ?? invoice.adaQuoteSnapshot,
    feedId: body.feedId ?? invoice.feedId,
    txHash: body.txHash ?? invoice.txHash,
    status: body.status ?? invoice.status,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ item: invoice }, { status: 200 });
}
