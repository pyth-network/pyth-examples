import type { PriceUpdate, WalletInfo } from "@/types";

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomAdaPrice(): PriceUpdate {
  // ADA/USD range: $0.30 – $1.20 → 30–120 cents
  const cents = Math.round(30 + Math.random() * 90);
  return {
    feedId: 16,
    priceUsdCents: String(cents),
    timestamp: Date.now(),
  };
}

export function fakeTxHash(): string {
  return randomHex(32);
}

export function fakeWallet(): WalletInfo {
  return {
    address: "addr_test1qr8nk3v5m9fjp7xz5l4v6jsd82mvcwas347s29",
    pkh: "fc3393513a0bc14fba0c0e8a9593a120e2e1456d47729a94c87466b",
    scriptAddress: "addr_test1wr9k5mjr8xqv6zx3hm7pzya5mlr9",
    network: "Preprod",
    balanceLovelace: "25000000",
    configured: true,
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
