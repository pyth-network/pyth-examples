"use client";

import { useWallet, useWalletList } from "@meshsdk/react";
import { useCallback, useEffect, useRef, useState } from "react";

function truncateAddr(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}…${addr.slice(-6)}`;
}

interface WalletConnectProps {
  /** Larger animated CTA for the hero (glow + shimmer). Dropdown still works. */
  primaryCTA?: boolean;
}

export default function WalletConnect({ primaryCTA = false }: WalletConnectProps) {
  const { connected, connecting, connect, disconnect, name, address } = useWallet();
  const wallets = useWalletList();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [close]);

  useEffect(() => {
    if (connected) close();
  }, [connected, close]);

  const activeWallet = name ? wallets.find((w) => w.id === name) : undefined;

  if (connected && name) {
    return (
      <div className="flex items-center gap-2">
        {activeWallet?.icon ? (
          <img src={activeWallet.icon} alt="" className="w-7 h-7 rounded-md" />
        ) : null}
        <div className="hidden sm:flex flex-col items-end text-right leading-tight">
          <span className="text-xs font-semibold text-bark">{activeWallet?.name ?? name}</span>
          {address ? (
            <span className="text-[11px] text-bark-light/80 font-mono">{truncateAddr(address)}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => disconnect()}
          className="text-sm font-semibold text-bark border border-clay-pale rounded-xl px-3 py-2 hover:bg-clay-pale/60 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const connectBtn = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      disabled={connecting}
      className="text-sm font-semibold text-white bg-clay rounded-xl px-4 py-2 shadow-sm hover:bg-clay-light transition-colors disabled:opacity-60"
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );

  return (
    <div className="relative" ref={rootRef}>
      {primaryCTA ? (
        <div className="cta-glow flex justify-center animate-scale-in-d">{connectBtn}</div>
      ) : (
        connectBtn
      )}

      {open && (
        <div
          className="absolute right-0 top-full z-[100] mt-2 w-[min(100vw-2rem,18rem)] rounded-2xl border border-clay-pale bg-warm py-2 shadow-lg"
          role="menu"
        >
          {wallets.length === 0 ? (
            <p className="px-4 py-3 text-xs text-bark-light leading-relaxed">
              No CIP-30 wallet found. Install{" "}
              <a
                href="https://namiwallet.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-clay underline"
              >
                Nami
              </a>
              ,{" "}
              <a
                href="https://eternl.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-clay underline"
              >
                Eternl
              </a>
              , or{" "}
              <a
                href="https://www.lace.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-clay underline"
              >
                Lace
              </a>
              .
            </p>
          ) : (
            <ul className="max-h-[min(60vh,20rem)] overflow-y-auto">
              {wallets.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-bark hover:bg-clay-pale/50 transition-colors"
                    onClick={() => {
                      void connect(w.id, undefined, true);
                    }}
                  >
                    {w.icon ? (
                      <img src={w.icon} alt="" className="h-9 w-9 shrink-0 rounded-lg" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-pale text-xs font-bold">
                        {w.name.slice(0, 2)}
                      </span>
                    )}
                    <span className="font-medium">{w.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
