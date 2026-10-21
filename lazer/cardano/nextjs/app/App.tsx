"use client";

import { MeshProvider } from "@meshsdk/react";
import dynamic from "next/dynamic";
import WalletConnect from "@/components/WalletConnect";

const VaultDashboard = dynamic(() => import("@/components/VaultDashboard"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-clay border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function App() {
  return (
    <MeshProvider>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-clay-pale/60">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-bark">Iron Pig</span>
            <span className="text-xs bg-clay-pale text-clay px-2 py-0.5 rounded-full font-semibold tracking-wide">
              preprod
            </span>
          </div>
          <WalletConnect />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg">
            <VaultDashboard />
          </div>
        </main>

        <footer className="text-center py-6 text-xs text-bark-light/50 border-t border-clay-pale/40">
          Running on Cardano preprod · Prices via{" "}
          <a
            href="https://pyth.network"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-bark-light"
          >
            Pyth Network
          </a>
        </footer>
      </div>
    </MeshProvider>
  );
}
