import { config } from "dotenv";
config();

export const PYTH_LAZER_ENDPOINTS = [
  "wss://pyth-lazer-0.dourolabs.app/v1/stream",
  "wss://pyth-lazer-1.dourolabs.app/v1/stream",
  "wss://pyth-lazer-2.dourolabs.app/v1/stream",
] as const;

export const PYTH_ACCESS_TOKEN = process.env.PYTH_ACCESS_TOKEN ?? "YOUR_ACCESS_TOKEN";

// ADA/USD feed ID on Pyth Lazer
export const ADA_USD_FEED_ID = 16;

// Max age of a price update accepted by the on-chain validator (ms)
export const MAX_PRICE_AGE_MS = 60_000;

// Blockfrost / Mesh provider
export const NETWORK = (process.env.CARDANO_NETWORK ?? "preprod") as "mainnet" | "preprod" | "preview";
export const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY ?? "";
export const BLOCKFROST_URL =
  NETWORK === "mainnet"
    ? "https://cardano-mainnet.blockfrost.io/api/v0"
    : `https://cardano-${NETWORK}.blockfrost.io/api/v0`;

// Wallet mnemonic (24 words, space-separated)
export const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC ?? "";

// Compiled validator script hash (from plutus.json)
export const VALIDATOR_SCRIPT_HASH = process.env.VALIDATOR_SCRIPT_HASH ?? "";
