"use client";

import { MeshWallet, BlockfrostProvider } from "@meshsdk/core";

const STORAGE_KEY = "pyth-demo-burner-mnemonic";

export function getMnemonic(): string[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 24) return parsed;
    } catch {
      // corrupted — regenerate
    }
  }

  const words = MeshWallet.brew(false, 256) as string[];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  return words;
}

export function regenerateMnemonic(): string[] {
  const words = MeshWallet.brew(false, 256) as string[];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  return words;
}

export function getMnemonicWords(): string[] {
  return getMnemonic();
}

export async function createBurnerWallet(): Promise<MeshWallet> {
  const words = getMnemonic();
  const wallet = new MeshWallet({
    networkId: 0,
    key: { type: "mnemonic", words },
  });
  await wallet.init();
  return wallet;
}
