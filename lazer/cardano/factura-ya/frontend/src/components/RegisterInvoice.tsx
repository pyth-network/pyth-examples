import { useState, type FormEvent } from "react";
import type { ConnectedWallet } from "../lib/wallet.ts";
import { registerInvoice, type TxResult } from "../lib/transactions.ts";

interface Props {
  wallet: ConnectedWallet | null;
}

interface InvoiceFormData {
  amountArs: string;
  dueDateDays: string;
  debtorName: string;
  debtorContact: string;
}

export function RegisterInvoice({ wallet }: Props) {
  const [form, setForm] = useState<InvoiceFormData>({
    amountArs: "",
    dueDateDays: "90",
    debtorName: "",
    debtorContact: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [txResult, setTxResult] = useState<TxResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!wallet) {
    return (
      <div className="empty">
        <h2>Register Invoice</h2>
        <p>Connect your wallet to register an invoice.</p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await registerInvoice({
        amountArs: Number(form.amountArs),
        dueDateDays: Number(form.dueDateDays),
        debtorName: form.debtorName,
        debtorContact: form.debtorContact,
        sellerAddress: wallet.address,
      });
      setTxResult(result);
      setSubmitted(true);
    } catch (err) {
      setTxResult({
        success: false,
        error: err instanceof Error ? err.message : "Transaction failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="success">
        <h3>Invoice Registered!</h3>
        <p>
          Your invoice for {Number(form.amountArs).toLocaleString()} ARS has
          been tokenized and listed on the marketplace.
        </p>
        {txResult?.txHash && (
          <p className="tx-info">
            Tx: <code>{txResult.txHash}</code>
          </p>
        )}
        <p className="tx-info">
          Collateral locked. NFT minted. Listed for investors.
        </p>
        <button onClick={() => setSubmitted(false)}>Register Another</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Register Invoice</h2>
      <form onSubmit={handleSubmit} className="invoice-form">
        <div className="form-field">
          <label htmlFor="amountArs">Invoice Amount (ARS)</label>
          <input
            id="amountArs"
            type="number"
            placeholder="100000"
            value={form.amountArs}
            onChange={(e) => setForm({ ...form, amountArs: e.target.value })}
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
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Submitting..." : "Tokenize & List"}
        </button>
        {txResult && !txResult.success && (
          <p className="wallet-error">{txResult.error}</p>
        )}
      </form>
    </div>
  );
}
