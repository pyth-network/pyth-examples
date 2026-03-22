/**
 * CIP-30 wallet connection for Cardano dApps.
 *
 * Supports Nami, Eternl, Flint, Lace, and any CIP-30 compliant wallet.
 */

// CIP-30 types
interface CardanoWalletApi {
  getNetworkId(): Promise<number>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getBalance(): Promise<string>;
  getUtxos(): Promise<string[] | null>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
}

interface CardanoWallet {
  name: string;
  icon: string;
  apiVersion: string;
  enable(): Promise<CardanoWalletApi>;
  isEnabled(): Promise<boolean>;
}

declare global {
  interface Window {
    cardano?: Record<string, CardanoWallet>;
  }
}

export interface WalletInfo {
  name: string;
  icon: string;
  id: string;
}

export interface ConnectedWallet {
  info: WalletInfo;
  api: CardanoWalletApi;
  address: string;
  networkId: number;
  balanceLovelace: bigint;
}

/** Detect available CIP-30 wallets. */
export function getAvailableWallets(): WalletInfo[] {
  if (!window.cardano) return [];

  const known = ["nami", "eternl", "flint", "lace", "yoroi", "typhon", "gerowallet"];
  const wallets: WalletInfo[] = [];

  for (const id of known) {
    const w = window.cardano[id];
    if (w && w.name && typeof w.enable === "function") {
      wallets.push({ name: w.name, icon: w.icon, id });
    }
  }

  return wallets;
}

/** Connect to a CIP-30 wallet by ID. */
export async function connectWallet(walletId: string): Promise<ConnectedWallet> {
  const wallet = window.cardano?.[walletId];
  if (!wallet) throw new Error(`Wallet ${walletId} not found`);

  const api = await wallet.enable();
  const networkId = await api.getNetworkId();
  const addresses = await api.getUsedAddresses();
  const address = addresses[0] ?? (await api.getUnusedAddresses())[0] ?? "";
  const balanceHex = await api.getBalance();
  // Balance is CBOR-encoded; for simplicity parse the lovelace from hex
  const balanceLovelace = parseBalanceHex(balanceHex);

  return {
    info: { name: wallet.name, icon: wallet.icon, id: walletId },
    api,
    address,
    networkId,
    balanceLovelace,
  };
}

/** Parse CBOR balance to lovelace (simplified — handles basic integer encoding). */
function parseBalanceHex(hex: string): bigint {
  try {
    // CBOR integers: if first byte < 0x18, value is the byte itself
    // 0x18 = 1-byte uint follows, 0x19 = 2-byte, 0x1a = 4-byte, 0x1b = 8-byte
    const bytes = hexToBytes(hex);
    if (bytes.length === 0) return 0n;

    const first = bytes[0];
    if (first <= 0x17) return BigInt(first);
    if (first === 0x18 && bytes.length >= 2) return BigInt(bytes[1]);
    if (first === 0x19 && bytes.length >= 3) {
      return BigInt((bytes[1] << 8) | bytes[2]);
    }
    if (first === 0x1a && bytes.length >= 5) {
      return BigInt(
        (bytes[1] << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4],
      );
    }
    if (first === 0x1b && bytes.length >= 9) {
      let val = 0n;
      for (let i = 1; i <= 8; i++) {
        val = (val << 8n) | BigInt(bytes[i]);
      }
      return val;
    }
    // Fallback for complex CBOR (maps with multi-asset)
    return 0n;
  } catch {
    return 0n;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Shorten an address for display. */
export function shortenAddress(addr: string): string {
  if (addr.length <= 20) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

/** Format lovelace as ADA. */
export function lovelaceToAda(lovelace: bigint): string {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toFixed(2);
}
