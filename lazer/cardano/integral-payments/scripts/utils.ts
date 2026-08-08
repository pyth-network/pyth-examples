/**
 * scripts/utils.ts
 *
 * Shared utilities for all IntegralPayments deployment and utility scripts.
 *
 * Provides:
 *  - Environment loading and validation
 *  - Lucid Evolution initialisation
 *  - plutus.json blueprint reading and CBOR extraction
 *  - Coloured console output helpers
 *  - Blockfrost health-check with retry
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Blockfrost,
  Lucid,
  applyParamsToScript,
  Data,
  Constr,
  type SpendingValidator,
  type Network,
} from "@lucid-evolution/lucid";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Directory resolution (ESM-safe)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/** Absolute path to the repository root (one level above scripts/) */
export const ROOT_DIR = path.resolve(__dirname, "..");

/** Absolute path to contracts/plutus.json */
export const BLUEPRINT_PATH = path.join(ROOT_DIR, "contracts", "plutus.json");

// ---------------------------------------------------------------------------
// Console helpers
// ---------------------------------------------------------------------------

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
};

export function log(msg: string)        { console.log(`${C.gray}[ip]${C.reset} ${msg}`); }
export function ok(msg: string)         { console.log(`${C.green}✓${C.reset} ${msg}`); }
export function warn(msg: string)       { console.warn(`${C.yellow}⚠${C.reset}  ${msg}`); }
export function err(msg: string)        { console.error(`${C.red}✗${C.reset}  ${msg}`); }
export function header(msg: string)     { console.log(`\n${C.bold}${C.cyan}${msg}${C.reset}\n${"─".repeat(60)}`); }
export function field(k: string, v: string) {
  console.log(`  ${C.gray}${k.padEnd(22)}${C.reset}${v}`);
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    err(`Missing required environment variable: ${C.bold}${key}${C.reset}`);
    process.exit(1);
  }
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export type ScriptEnv = {
  network:           Network;
  blockfrostApiKey:  string;
  blockfrostUrl:     string;
  trustedSignerKey:  string;
  toleranceBps:      number;
  merchantAddress:   string;
  serviceSeed:       string;
};

/** Load and validate all environment variables needed by the scripts. */
export function loadEnv(): ScriptEnv {
  const network = optional("NETWORK", "Preprod") as Network;
  if (!["Mainnet", "Preprod", "Preview"].includes(network)) {
    err(`NETWORK must be Mainnet | Preprod | Preview, got: ${network}`);
    process.exit(1);
  }

  const BLOCKFROST_URLS: Record<string, string> = {
    Mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
    Preprod: "https://cardano-preprod.blockfrost.io/api/v0",
    Preview:  "https://cardano-preview.blockfrost.io/api/v0",
  };

  return {
    network,
    blockfrostApiKey: required("BLOCKFROST_API_KEY"),
    blockfrostUrl:    optional("BLOCKFROST_URL", BLOCKFROST_URLS[network]!),
    trustedSignerKey: required("TRUSTED_SIGNER_KEY"),
    toleranceBps:     parseInt(optional("TOLERANCE_BPS", "50"), 10),
    merchantAddress:  required("MERCHANT_WALLET_ADDRESS"),
    serviceSeed:      required("SERVICE_WALLET_SEED"),
  };
}

// ---------------------------------------------------------------------------
// Lucid initialisation
// ---------------------------------------------------------------------------

/** Create a Lucid instance connected to Blockfrost and select the service wallet. */
export async function initLucid(env: ScriptEnv): Promise<ReturnType<typeof Lucid>> {
  const provider = new Blockfrost(env.blockfrostUrl, env.blockfrostApiKey);
  const lucid    = await Lucid(provider, env.network);
  lucid.selectWallet.fromSeed(env.serviceSeed);
  return lucid;
}

// ---------------------------------------------------------------------------
// Blueprint / validator helpers
// ---------------------------------------------------------------------------

export type Blueprint = {
  preamble:   { version: string; plutusVersion: string };
  validators: Array<{
    title:        string;
    datum?:       { schema: unknown };
    redeemer:     { schema: unknown };
    parameters?:  Array<{ title: string; schema: unknown }>;
    compiledCode: string;
    hash:         string;
  }>;
};

/** Read and parse contracts/plutus.json produced by `aiken build`. */
export function readBlueprint(): Blueprint {
  if (!fs.existsSync(BLUEPRINT_PATH)) {
    err(`plutus.json not found at: ${BLUEPRINT_PATH}`);
    err(`Run  cd contracts && aiken build  first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(BLUEPRINT_PATH, "utf8")) as Blueprint;
}

/**
 * Find the `payment_gateway.spend` validator entry in the blueprint,
 * apply the two runtime parameters (trustedSignerKey, toleranceBps),
 * and return the finalised `SpendingValidator` ready for Lucid.
 *
 * Parameter encoding mirrors the on-chain Aiken validator signature:
 *   validator payment_gateway(trusted_signer: ByteArray, tolerance_bps: Int)
 *
 * @param blueprint       Parsed plutus.json
 * @param trustedSigner   32-byte Ed25519 signer key (hex, no 0x)
 * @param toleranceBps    Slippage tolerance in basis points
 */
export function applyValidatorParams(
  blueprint: Blueprint,
  trustedSigner: string,
  toleranceBps: number,
): SpendingValidator {
  const entry = blueprint.validators.find((v) =>
    v.title === "payment_gateway.spend",
  );
  if (!entry) {
    err(`Validator "payment_gateway.spend" not found in plutus.json.`);
    err(`Available validators: ${blueprint.validators.map((v) => v.title).join(", ")}`);
    process.exit(1);
  }

  // Apply parameters in declaration order using applyParamsToScript.
  // Aiken ByteArray parameters are passed as hex strings.
  // Aiken Int parameters are passed as BigInt.
  const parameterisedCbor = applyParamsToScript(
    entry.compiledCode,
    [trustedSigner, BigInt(toleranceBps)],
  );

  return { type: "PlutusV3", script: parameterisedCbor };
}

// ---------------------------------------------------------------------------
// Blockfrost health-check
// ---------------------------------------------------------------------------

/**
 * Verify the Blockfrost API key is valid and the node is reachable.
 * Retries up to `maxRetries` times with exponential back-off.
 */
export async function checkBlockfrost(
  url: string,
  apiKey: string,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${url}/health`, {
        headers: { project_id: apiKey },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const body = await res.json() as { is_healthy: boolean };
      if (!body.is_healthy) throw new Error("Blockfrost reports unhealthy");
      return; // success
    } catch (e) {
      if (attempt === maxRetries) {
        err(`Blockfrost health-check failed after ${maxRetries} attempts: ${String(e)}`);
        process.exit(1);
      }
      const delay = 1000 * 2 ** attempt;
      warn(`Blockfrost unreachable (attempt ${attempt}/${maxRetries}). Retrying in ${delay / 1000}s…`);
      await sleep(delay);
    }
  }
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Poll until `condition()` returns true or `timeoutMs` elapses.
 * `intervalMs` controls the polling frequency.
 */
export async function waitUntil(
  condition: () => Promise<boolean>,
  timeoutMs  = 120_000,
  intervalMs = 5_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return true;
    await sleep(intervalMs);
  }
  return false;
}

/** Format lovelace as a human-readable ADA string with 6 decimal places. */
export function formatAda(lovelace: bigint): string {
  const ada = Number(lovelace) / 1_000_000;
  return `${ada.toFixed(6)} ADA (${lovelace.toLocaleString()} lovelace)`;
}

/** Abbreviate a long hex string for display: first 8 + … + last 8 chars. */
export function abbrev(hex: string, len = 8): string {
  if (hex.length <= len * 2 + 3) return hex;
  return `${hex.slice(0, len)}…${hex.slice(-len)}`;
}
