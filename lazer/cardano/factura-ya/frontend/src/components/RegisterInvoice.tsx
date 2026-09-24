import { useState, type FormEvent } from "react";
import type { ConnectedWallet } from "../lib/wallet.ts";
import { registerInvoice } from "../lib/transactions.ts";

interface Props {
  wallet: ConnectedWallet | null;
}

interface InvoiceFormData {
  amountUsd: string;
  dueDateDays: string;
  debtorName: string;
  debtorContact: string;
}

export function RegisterInvoice({ wallet }: Props) {
  const [form, setForm] = useState<InvoiceFormData>({
    amountUsd: "",
    dueDateDays: "90",
    debtorName: "",
    debtorContact: "",
  });

  if (!wallet) {
    return (
      <div className="empty">
        <h2>Register Invoice</h2>
        <p>Connect your wallet to register an invoice.</p>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    registerInvoice({
      amountUsd: Number(form.amountUsd),
      dueDateDays: Number(form.dueDateDays),
      debtorName: form.debtorName,
      debtorContact: form.debtorContact,
      sellerAddress: wallet.address,
    });
  };

  return (
    <div>
      <h2>Register Invoice</h2>
      <form onSubmit={handleSubmit} className="invoice-form">
        <div className="form-field">
          <label htmlFor="amountUsd">Invoice Amount (USD)</label>
          <input
            id="amountUsd"
            type="number"
            placeholder="1000"
            value={form.amountUsd}
            onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="dueDateDays">Due Date (days from now)</label>
          <input
            id="dueDateDays"
            type="number"
            value={form.dueDateDays}
            onChange={(e) => setForm({ ...form, dueDateDays: e.target.value })}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="debtorName">Debtor Name</label>
          <input
            id="debtorName"
            type="text"
            placeholder="ACME Corp"
            value={form.debtorName}
            onChange={(e) => setForm({ ...form, debtorName: e.target.value })}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="debtorContact">Debtor Contact (email/phone)</label>
          <input
            id="debtorContact"
            type="text"
            placeholder="billing@acme.com"
            value={form.debtorContact}
            onChange={(e) =>
              setForm({ ...form, debtorContact: e.target.value })
            }
            required
          />
        </div>
        <div className="form-info">
          <p>Collateral: ~10% of invoice value will be locked as guarantee</p>
          <p>Wallet: {wallet.info.name} connected</p>
        </div>
        <button type="submit" className="submit-btn">
          Tokenize & List
        </button>
        <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.8rem" }}>
          Opens the signing page to authorize the transaction with your wallet.
        </p>
      </form>
    </div>
  );
}
