import { useState } from "react";
import { Marketplace } from "./components/Marketplace.tsx";
import { RegisterInvoice } from "./components/RegisterInvoice.tsx";
import { PriceDisplay } from "./components/PriceDisplay.tsx";
import { WalletConnect } from "./components/WalletConnect.tsx";
import { DemoGuide } from "./components/DemoGuide.tsx";
import { Deploy } from "./components/Deploy.tsx";
import type { ConnectedWallet } from "./lib/wallet.ts";

type Tab = "marketplace" | "register" | "deploy";

export function App() {
  const [tab, setTab] = useState<Tab>("marketplace");
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);

  return (
    <div className="app">
      <header>
        <div className="header-top">
          <h1>Factura Ya</h1>
          <WalletConnect
            connected={wallet}
            onConnect={setWallet}
            onDisconnect={() => setWallet(null)}
          />
        </div>
        <p className="subtitle">
          Sell your invoices, get paid today — powered by Cardano & Pyth
        </p>
        <PriceDisplay />
        <nav>
          <button
            className={tab === "marketplace" ? "active" : ""}
            onClick={() => setTab("marketplace")}
          >
            Marketplace
          </button>
          <button
            className={tab === "register" ? "active" : ""}
            onClick={() => setTab("register")}
          >
            Register Invoice
          </button>
          <button
            className={tab === "deploy" ? "active" : ""}
            onClick={() => setTab("deploy")}
          >
            Deploy
          </button>
        </nav>
      </header>

      <DemoGuide wallet={wallet} activeTab={tab} />

      <main>
        {tab === "marketplace" && <Marketplace />}
        {tab === "register" && <RegisterInvoice wallet={wallet} />}
        {tab === "deploy" && <Deploy />}
      </main>
      <footer>
        <p>
          Built for the Pythathon hackathon by Facturas Ya — Cardano + Pyth + TxPipe
        </p>
      </footer>
    </div>
  );
}
