import { useCallback, useEffect, useRef, useState } from "react";
import { Decoder } from "cbor-x";

const cborDecoder = new Decoder({ mapsAsObjects: false });

interface WalletApi {
  getUsedAddresses(): Promise<string[]>;
  getBalance(): Promise<string>;
  signTx(txHex: string, partial: boolean): Promise<string>;
  submitTx(txHex: string): Promise<string>;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balanceLovelace: number | null;
  balancePusd: number | null;
  walletApi: WalletApi | null;
  connect: (walletName: string) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => void;
}

declare global {
  interface Window {
    cardano?: Record<
      string,
      {
        enable(): Promise<WalletApi>;
        isEnabled(): Promise<boolean>;
      }
    >;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const PUSD_NAME_HEX = "50555344"; // "PUSD" as hex

/** Convert a CBOR-decoded key to lowercase hex, handling both Uint8Array and string. */
function keyToHex(key: unknown): string {
  if (key instanceof Uint8Array) return bytesToHex(key);
  if (key instanceof ArrayBuffer) return bytesToHex(new Uint8Array(key));
  if (typeof key === "string") {
    // Could be UTF-8 text or hex — encode UTF-8 bytes to hex
    return Array.from(new TextEncoder().encode(key), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return "";
}

interface WalletBalance {
  lovelace: number;
  pusd: number;
}

/** Parse CIP-30 getBalance() CBOR into lovelace + PUSD amounts. */
function decodeCborBalance(hex: string): WalletBalance {
  const decoded = cborDecoder.decode(hexToBytes(hex));

  // Pure lovelace (no multi-assets)
  if (typeof decoded === "number" || typeof decoded === "bigint") {
    return { lovelace: Number(decoded), pusd: 0 };
  }

  // Array [coin, multiasset_map]
  if (Array.isArray(decoded) && decoded.length === 2) {
    const coin = Number(decoded[0]);
    const multiAsset = decoded[1];

    if (!(multiAsset instanceof Map)) {
      return { lovelace: coin, pusd: 0 };
    }

    // Find PUSD under any policy
    let pusd = 0;
    for (const [, assets] of multiAsset) {
      if (!(assets instanceof Map)) continue;
      for (const [assetKey, quantity] of assets) {
        const assetHex = keyToHex(assetKey);
        if (assetHex === PUSD_NAME_HEX) {
          pusd += Number(quantity);
        }
      }
    }
    return { lovelace: coin, pusd };
  }

  return { lovelace: 0, pusd: 0 };
}

export function useWallet(): WalletState {
  const [walletApi, setWalletApi] = useState<WalletApi | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balanceLovelace, setBalanceLovelace] = useState<number | null>(null);
  const [balancePusd, setBalancePusd] = useState<number | null>(null);
  const walletApiRef = useRef<WalletApi | null>(null);

  const fetchBalance = useCallback(async () => {
    const api = walletApiRef.current;
    if (!api) return;
    try {
      const cborHex = await api.getBalance();
      const bal = decodeCborBalance(cborHex);
      setBalanceLovelace(bal.lovelace);
      setBalancePusd(bal.pusd);
    } catch (err) {
      console.error("[Wallet] Failed to fetch balance:", err);
    }
  }, []);

  const connect = useCallback(async (walletName: string) => {
    console.log(`[Wallet] Connecting to ${walletName}...`);
    const provider = window.cardano?.[walletName];
    if (!provider) throw new Error(`${walletName} wallet not found`);
    const api = await provider.enable();
    const addrs = await api.getUsedAddresses();
    console.log(`[Wallet] Connected, address:`, addrs[0]);
    setWalletApi(api);
    walletApiRef.current = api;
    setAddress(addrs[0] ?? null);
  }, []);

  const disconnect = useCallback(() => {
    setWalletApi(null);
    walletApiRef.current = null;
    setAddress(null);
    setBalanceLovelace(null);
    setBalancePusd(null);
  }, []);

  // Poll balance every 5 seconds while connected
  useEffect(() => {
    if (!walletApi) return;
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [walletApi, fetchBalance]);

  return {
    connected: walletApi !== null,
    address,
    balanceLovelace,
    balancePusd,
    walletApi,
    connect,
    disconnect,
    refreshBalance: fetchBalance,
  };
}
