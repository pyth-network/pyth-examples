/**
 * Simple REST API + Oura webhook receiver for the Factura Ya marketplace indexer.
 *
 * Stores marketplace state in-memory (JSON). For a hackathon MVP this is
 * sufficient — a production version would use PostgreSQL.
 *
 * Endpoints:
 *   GET  /invoices        — all active listings
 *   GET  /invoices/:id    — single invoice detail
 *   POST /oura/event      — webhook sink for Oura pipeline events
 */

import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT ?? 3001;

// --- In-memory store ---

interface IndexedInvoice {
  invoiceId: string;
  seller: string;
  askingPriceLovelace: number;
  originalAmountArs: number;
  pythPriceAtListing: number;
  pythExponentAtListing: number;
  dueDatePosixMs: number;
  status: "Listed" | "Sold" | "Delisted";
  buyer: string | null;
  txHash: string;
  updatedAt: number;
}

const invoices = new Map<string, IndexedInvoice>();

// --- API routes ---

app.get("/invoices", (_req, res) => {
  const active = [...invoices.values()].filter((i) => i.status === "Listed");
  res.json({ invoices: active, total: active.length });
});

app.get("/invoices/:id", (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(invoice);
});

// Return all invoices regardless of status (for debugging / frontend)
app.get("/invoices/all", (_req, res) => {
  res.json({ invoices: [...invoices.values()], total: invoices.size });
});

// --- Oura webhook receiver ---

/**
 * Receives transaction events from Oura.
 *
 * Oura sends events as JSON with transaction details. We parse the
 * marketplace datum from outputs to index listings.
 *
 * Event shape (simplified):
 * {
 *   context: { tx_hash, block_number, slot, timestamp },
 *   transaction: {
 *     outputs: [{ address, datum: { fields: [...] }, ... }]
 *   }
 * }
 */
app.post("/oura/event", (req, res) => {
  try {
    const event = req.body;
    processOuraEvent(event);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error processing Oura event:", err);
    res.status(500).json({ error: "Failed to process event" });
  }
});

function processOuraEvent(event: Record<string, unknown>): void {
  const ctx = event.context as { tx_hash?: string; timestamp?: number } | undefined;
  const tx = event.transaction as {
    outputs?: Array<{
      address?: string;
      datum?: { fields?: unknown[] };
    }>;
  } | undefined;

  if (!ctx?.tx_hash || !tx?.outputs) return;

  for (const output of tx.outputs) {
    if (!output.datum?.fields) continue;
    tryParseListingDatum(output.datum.fields, ctx.tx_hash, ctx.timestamp ?? Date.now());
  }
}

/**
 * Attempt to parse a ListingDatum from Oura datum fields.
 *
 * Expected field order matches the on-chain ListingDatum:
 * [invoice_id, seller, asking_price_lovelace, original_amount_ars,
 *  pyth_price_at_listing, pyth_exponent_at_listing, due_date_posix_ms, status]
 */
function tryParseListingDatum(
  fields: unknown[],
  txHash: string,
  timestamp: number,
): void {
  if (fields.length < 8) return;

  try {
    const invoiceId = String(fields[0]);
    const seller = String(fields[1]);
    const askingPriceLovelace = Number(fields[2]);
    const originalAmountArs = Number(fields[3]);
    const pythPriceAtListing = Number(fields[4]);
    const pythExponentAtListing = Number(fields[5]);
    const dueDatePosixMs = Number(fields[6]);
    const statusRaw = fields[7];

    let status: "Listed" | "Sold" | "Delisted" = "Listed";
    if (typeof statusRaw === "object" && statusRaw !== null) {
      const tag = (statusRaw as { constructor?: number }).constructor;
      if (tag === 0) status = "Listed";
      else if (tag === 1) status = "Sold";
      else if (tag === 2) status = "Delisted";
    }

    invoices.set(invoiceId, {
      invoiceId,
      seller,
      askingPriceLovelace,
      originalAmountArs,
      pythPriceAtListing,
      pythExponentAtListing,
      dueDatePosixMs,
      status,
      buyer: null,
      txHash,
      updatedAt: timestamp,
    });

    console.log(`[indexer] ${status} invoice ${invoiceId} (tx: ${txHash.slice(0, 8)}...)`);
  } catch {
    // Not a listing datum, skip
  }
}

// --- Manual seeding (for demo) ---

app.post("/invoices/seed", (req, res) => {
  const invoice = req.body as IndexedInvoice;
  if (!invoice.invoiceId) {
    res.status(400).json({ error: "Missing invoiceId" });
    return;
  }
  invoices.set(invoice.invoiceId, {
    ...invoice,
    updatedAt: Date.now(),
  });
  res.status(201).json({ ok: true, invoiceId: invoice.invoiceId });
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`[indexer] Factura Ya indexer API running on port ${PORT}`);
});

export { app, invoices };
