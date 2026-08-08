import * as path from "path";
import * as Core from "@blaze-cardano/core";
import { HotWallet } from "@blaze-cardano/wallet";
import { Blockfrost } from "@blaze-cardano/query";
import { Blaze } from "@blaze-cardano/sdk";
import { applyParams } from "@blaze-cardano/uplc";
import { makeUplcEvaluator } from "@blaze-cardano/vm";

// ── Config ───────────────────────────────────────────────────────────────

export const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY!;
export const NETWORK = process.env.NETWORK ?? "Preprod";
export const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC!;
export const PYTH_POLICY_ID = process.env.PYTH_POLICY_ID!;

// ── Blueprint ────────────────────────────────────────────────────────────

const blueprintPath = path.resolve(import.meta.dir, "../../contracts/plutus.json");
const blueprint = JSON.parse(await Bun.file(blueprintPath).text());

function getValidator(title: string): string {
  const v = blueprint.validators.find((v: any) => v.title === title);
  if (!v) throw new Error(`Validator not found: ${title}`);
  return v.compiledCode;
}

export const marketSpendCode = getValidator("market.market.spend");

// ── Datum helpers ────────────────────────────────────────────────────────

export function constr(idx: number, fields: Core.PlutusData[]): Core.PlutusData {
  const list = new Core.PlutusList();
  for (const f of fields) list.add(f);
  return Core.PlutusData.newConstrPlutusData(
    new Core.ConstrPlutusData(BigInt(idx), list)
  );
}

export function bytes(hex: string): Core.PlutusData {
  return Core.PlutusData.newBytes(Buffer.from(hex, "hex"));
}

export function integer(n: bigint): Core.PlutusData {
  return Core.PlutusData.newInteger(n);
}

export const FALSE = constr(0, []);
export const TRUE = constr(1, []);
export const NONE = constr(1, []);
export const MINT_TOKENS = constr(0, []);
export const BURN_TOKENS = constr(1, []);
export const RESOLVE = constr(1, []);

export function mkMarketDatum(p: {
  creator: string;
  pythId: string;
  feedId: number;
  targetPrice: bigint;
  resolutionTime: bigint;
  tokenPolicy: string;
  seed: bigint;
}): Core.PlutusData {
  return constr(0, [
    bytes(p.creator),
    bytes(p.pythId),
    integer(BigInt(p.feedId)),
    integer(p.targetPrice),
    integer(p.resolutionTime),
    bytes(p.tokenPolicy),
    integer(p.seed),
    integer(p.seed),
    integer(p.seed * p.seed),
    integer(p.seed),
    integer(p.seed),
    integer(p.seed),
    FALSE,
    NONE,
  ]);
}

// ── Blaze setup ──────────────────────────────────────────────────────────

export async function setupBlaze() {
  const networkId =
    NETWORK === "Mainnet" ? Core.NetworkId.Mainnet : Core.NetworkId.Testnet;
  const blazeNetwork = `cardano-${NETWORK.toLowerCase()}` as "cardano-preprod" | "cardano-preview" | "cardano-mainnet";
  const provider = new Blockfrost({
    network: blazeNetwork,
    projectId: BLOCKFROST_API_KEY,
  });

  const entropy = Core.mnemonicToEntropy(WALLET_MNEMONIC, Core.wordlist);
  const masterKey = Core.Bip32PrivateKey.fromBip39Entropy(Buffer.from(entropy), "");
  const wallet = await HotWallet.fromMasterkey(masterKey.hex(), provider, networkId);
  const blaze = await Blaze.from(provider, wallet);
  return { blaze, provider, wallet };
}

export function getSlotConfig() {
  return Core.SLOT_CONFIG_NETWORK[NETWORK as keyof typeof Core.SLOT_CONFIG_NETWORK]
    ?? Core.SLOT_CONFIG_NETWORK.Preprod;
}

export async function makeEvaluator(provider: Blockfrost) {
  const params = await provider.getParameters();
  return makeUplcEvaluator(params, 1.2, 1.2, getSlotConfig());
}

export async function submitTx(signed: Core.Transaction) {
  const txCbor = signed.toCbor();
  const res = await fetch(
    `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0/tx/submit`,
    {
      method: "POST",
      headers: { project_id: BLOCKFROST_API_KEY, "Content-Type": "application/cbor" },
      body: Buffer.from(txCbor, "hex"),
    }
  );
  const body = await res.text();
  if (!res.ok) throw new Error(`Submit failed (${res.status}): ${body}`);
  return JSON.parse(body) as string;
}

// ── Script derivation ────────────────────────────────────────────────────

export function deriveScript(oneShotTxHash: string, oneShotIdx: number) {
  const oneShotParam = constr(0, [
    constr(0, [bytes(oneShotTxHash), integer(BigInt(oneShotIdx))]),
  ]);
  const parameterizedCode = applyParams(Core.HexBlob(marketSpendCode), oneShotParam);
  const marketScript = Core.Script.newPlutusV3Script(
    new Core.PlutusV3Script(Core.HexBlob(parameterizedCode))
  );
  const policyId = Core.PolicyId(marketScript.hash().toString() as Core.Hash28ByteBase16);
  const scriptAddr = Core.addressFromValidator(Core.NetworkId.Testnet, marketScript);
  return { marketScript, policyId, scriptAddr };
}

export { Core, applyParams, Blaze, Blockfrost, HotWallet };
