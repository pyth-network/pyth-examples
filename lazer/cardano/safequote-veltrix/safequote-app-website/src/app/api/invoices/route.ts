import { NextResponse } from "next/server";
import { invoices } from "@/features/invoices/lib/invoice-store";
import type { Invoice } from "@/types/invoice";

export async function GET() {
  return NextResponse.json({ items: invoices }, { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sellerAddress: string;
    clientName: string;
    concept: string;
    amountUsd: number;
    pinHash: string;
    invoiceNftPolicyId: string;
    invoiceNftName: string;
    deadline: string;
  };

  const now = new Date().toISOString();

  const invoice: Invoice = {
    id: crypto.randomUUID(),
    sellerAddress: body.sellerAddress,
    clientName: body.clientName,
    concept: body.concept,
    amountUsd: Number(body.amountUsd),
    pinHash: body.pinHash,
    invoiceNftPolicyId: body.invoiceNftPolicyId,
    invoiceNftName: body.invoiceNftName,
    status: "open",
    deadline: body.deadline,
    createdAt: now,
    updatedAt: now,
  };

  invoices.unshift(invoice);
  return NextResponse.json({ item: invoice }, { status: 201 });
}
