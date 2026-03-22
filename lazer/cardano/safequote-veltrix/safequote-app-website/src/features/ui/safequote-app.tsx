"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  connectWallet,
  getInstalledWallets,
} from "@/features/wallet/lib/wallet-adapter";
import type { Invoice } from "@/types/invoice";
import type { AdaUsdQuote } from "@/types/oracle";

function hashPin(pin: string) {
  return pin.trim().toLowerCase();
}

function quoteRate(quote: AdaUsdQuote) {
  return Number(quote.price) * 10 ** quote.exponent;
}

export function SafeQuoteApp() {
  const [wallets, setWallets] = useState<{ name: string }[]>([]);
  const [walletName, setWalletName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [quote, setQuote] = useState<AdaUsdQuote | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [createForm, setCreateForm] = useState({
    clientName: "",
    concept: "",
    amountUsd: "500",
    pin: "",
    deadline: "",
  });

  async function fetchInvoices() {
    const response = await fetch("/api/invoices");
    const payload = (await response.json()) as { items: Invoice[] };
    return payload.items;
  }

  async function fetchQuote() {
    const response = await fetch("/api/oracle/ada-usd", { method: "POST" });
    const payload = (await response.json()) as { item: AdaUsdQuote };
    return payload.item;
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const [items, nextQuote, installedWallets] = await Promise.all([
        fetchInvoices(),
        fetchQuote(),
        getInstalledWallets(),
      ]);

      if (!active) {
        return;
      }

      startTransition(() => {
        setInvoices(items);
        setQuote(nextQuote);
        setWallets(installedWallets as { name: string }[]);
        setWalletName((current) => current || installedWallets[0]?.name || "");
      });
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const myInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.sellerAddress === walletAddress),
    [invoices, walletAddress],
  );

  const paidByMe = useMemo(
    () => invoices.filter((invoice) => invoice.buyerAddress === walletAddress),
    [invoices, walletAddress],
  );

  async function handleConnectWallet() {
    const connection = await connectWallet(walletName);
    setWalletAddress(connection.changeAddress);

    await fetch("/api/auth/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletName,
        address: connection.changeAddress,
      }),
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/wallet", { method: "DELETE" });

    startTransition(() => {
      setWalletAddress("");
    });
  }

  async function handleCreateInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerAddress: walletAddress,
        clientName: createForm.clientName,
        concept: createForm.concept,
        amountUsd: Number(createForm.amountUsd),
        pinHash: hashPin(createForm.pin),
        invoiceNftPolicyId: `${process.env.NEXT_PUBLIC_INVOICE_NFT_POLICY_ID}`,
        invoiceNftName: `invoice-${Date.now()}`,
        deadline: new Date(createForm.deadline).toISOString(),
      }),
    });

    const items = await fetchInvoices();
    startTransition(() => {
      setInvoices(items);
    });
  }

  async function handlePayInvoice(invoice: Invoice, pin: string) {
    if (!quote) {
      return;
    }

    const rate = quoteRate(quote);
    const minAda = invoice.amountUsd / rate;

    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerAddress: walletAddress,
        adaQuoteSnapshot: minAda,
        feedId: quote.feedId,
        txHash: `demo_${invoice.id}_${Date.now()}`,
        status: hashPin(pin) === invoice.pinHash ? "paid" : invoice.status,
      }),
    });

    const items = await fetchInvoices();
    startTransition(() => {
      setInvoices(items);
    });
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>SafeQuote</h1>
      <p>Quotes in USD. Settled in ADA.</p>
      <p>Secure milestone escrow powered by Pyth.</p>

      <section>
        <h2>Wallet</h2>
        <select
          value={walletName}
          onChange={(event) => setWalletName(event.target.value)}
        >
          {wallets.map((wallet) => (
            <option key={wallet.name} value={wallet.name}>
              {wallet.name}
            </option>
          ))}
        </select>
        {walletAddress ? (
          <button onClick={() => void handleLogout()} type="button">
            Logout
          </button>
        ) : (
          <button onClick={() => void handleConnectWallet()} type="button">
            Connect wallet
          </button>
        )}
        <p>{walletAddress || "No wallet connected"}</p>
      </section>

      {walletAddress ? (
        <section>
          <h2>Create invoice</h2>
          <form onSubmit={handleCreateInvoice}>
            <input
              placeholder="Client name"
              value={createForm.clientName}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  clientName: event.target.value,
                }))
              }
            />
            <input
              placeholder="Concept"
              value={createForm.concept}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  concept: event.target.value,
                }))
              }
            />
            <input
              placeholder="USD amount"
              value={createForm.amountUsd}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  amountUsd: event.target.value,
                }))
              }
            />
            <input
              placeholder="PIN"
              value={createForm.pin}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  pin: event.target.value,
                }))
              }
            />
            <input
              type="datetime-local"
              value={createForm.deadline}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  deadline: event.target.value,
                }))
              }
            />
            <button type="submit">Create invoice NFT</button>
          </form>
        </section>
      ) : (
        <section>
          <h2>Create invoice</h2>
          <p>Connect a preprod wallet to create a new invoice NFT.</p>
        </section>
      )}

      <section>
        <h2>My emitted invoices</h2>
        {myInvoices.map((invoice) => (
          <article key={invoice.id}>
            <strong>{invoice.clientName}</strong>
            <p>{invoice.concept}</p>
            <p>{invoice.amountUsd} USD</p>
            <p>{invoice.status}</p>
          </article>
        ))}
      </section>

      <section>
        <h2>Open invoices</h2>
        {invoices
          .filter((invoice) => invoice.status === "open")
          .map((invoice) => (
            <PayCard
              invoice={invoice}
              key={invoice.id}
              onPay={handlePayInvoice}
              quote={quote}
            />
          ))}
      </section>

      <section>
        <h2>Paid by my wallet</h2>
        {paidByMe.map((invoice) => (
          <article key={invoice.id}>
            <strong>{invoice.clientName}</strong>
            <p>{invoice.status}</p>
            <p>
              {invoice.invoiceNftPolicyId}.{invoice.invoiceNftName}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}

function PayCard({
  invoice,
  quote,
  onPay,
}: {
  invoice: Invoice;
  quote: AdaUsdQuote | null;
  onPay: (invoice: Invoice, pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState("");

  const minAda = quote
    ? invoice.amountUsd / (Number(quote.price) * 10 ** quote.exponent)
    : 0;

  return (
    <article>
      <strong>{invoice.clientName}</strong>
      <p>{invoice.amountUsd} USD</p>
      <p>Min ADA: {quote ? minAda.toFixed(4) : "Loading..."}</p>
      <input
        value={pin}
        onChange={(event) => setPin(event.target.value)}
        placeholder="PIN"
      />
      <button onClick={() => void onPay(invoice, pin)} type="button">
        Pay invoice
      </button>
    </article>
  );
}
