import type { Invoice } from "@/types/invoice";

export const invoices: Invoice[] = [];

export function findInvoiceById(id: string) {
  return invoices.find((invoice) => invoice.id === id) ?? null;
}
