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
  getUtxos(): Promise<string[] | null | undefined>;
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
  addressBech32: string;
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

  console.log(`[wallet] Enabling ${walletId}...`);
  const api = await wallet.enable();
  console.log("[wallet] Enabled, querying network...");

  const networkId = await api.getNetworkId();
  console.log(`[wallet] Network ID: ${networkId}`);

  // CIP-30 returns hex-encoded raw address bytes (not CBOR)
  // We need to convert to bech32 for display and Koios queries
  const usedAddresses = await api.getUsedAddresses();
  const unusedAddresses = await api.getUnusedAddresses();
  const addressHex = usedAddresses[0] ?? unusedAddresses[0] ?? "";
  console.log(`[wallet] Address (hex): ${addressHex}`);

  if (!addressHex) {
    throw new Error("No address found in wallet");
  }

  const bech32 = hexAddressToBech32(addressHex, networkId);
  console.log(`[wallet] Address (bech32): ${bech32}`);

  const balanceLovelace = await fetchBalanceFromKoios(bech32);
  console.log(`[wallet] Balance: ${Number(balanceLovelace) / 1_000_000} ADA`);

  return {
    info: { name: wallet.name, icon: wallet.icon, id: walletId },
    api,
    address: addressHex,
    addressBech32: bech32,
    networkId,
    balanceLovelace,
  };
}

/** Convert hex-encoded raw address bytes to bech32. */
function hexAddressToBech32(hexAddr: string, networkId: number): string {
  const prefix = networkId === 0 ? "addr_test" : "addr";
  const bytes = hexToBytes(hexAddr);
  const words = bech32ConvertBits(bytes, 8, 5, true);
  return bech32Encode(prefix, words);
}

// --- Bech32 encoding (RFC compliant) ---

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) ret.push((polymod >> (5 * (5 - i))) & 31);
  return ret;
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = data.concat(bech32CreateChecksum(hrp, data));
  return hrp + "1" + combined.map((d) => BECH32_CHARSET[d]).join("");
}

function bech32ConvertBits(
  data: Uint8Array,
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) {
    ret.push((acc << (toBits - bits)) & maxv);
  }
  return ret;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Fetch ADA balance from Koios. */
async function fetchBalanceFromKoios(bech32Addr: string): Promise<bigint> {
  try {
    const res = await fetch("/koios/api/v1/address_info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _addresses: [bech32Addr] }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data[0]?.balance) {
        return BigInt(data[0].balance);
      }
    }
  } catch {
    console.warn("[wallet] Could not fetch balance from Koios");
  }
  return 0n;
}

/** Shorten an address for display. */
export function shortenAddress(addr: string): string {
  if (addr.length <= 20) return addr;
  return `${addr.slice(0, 12)}...${addr.slice(-8)}`;
}

/** Format lovelace as ADA. */
export function lovelaceToAda(lovelace: bigint): string {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toFixed(2);
}
