import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BlockfrostProvider,
  MeshWallet,
  MeshTxBuilder,
  Transaction,
  type PlutusScript,
  type Data,
  type UTxO,
  resolveScriptHash,
  serializePlutusScript,
  applyParamsToScript,
  unixTimeToEnclosingSlot,
  SLOT_CONFIG_NETWORK,
  deserializeAddress,
  serializeRewardAddress,
} from "@meshsdk/core";
import type { OracleDatum } from "@/types";

interface Blueprint {
  validators: { title: string; compiledCode: string; hash: string }[];
}

const NETWORK = (process.env.CARDANO_NETWORK ?? "preprod") as
  | "mainnet"
  | "preprod"
  | "preview";

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY ?? "";

// Pyth Lazer on-chain addresses (preprod) — fixed deployment, no env config needed
const PYTH_CONTRACT_POLICY_ID =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";
const PYTH_STATE_UTXO_TX_HASH =
  "49f981daf1f5a5dc1a59357b6ebd2b7f3962f7d47a73ba048a033a123e2539ed";
const PYTH_STATE_UTXO_TX_INDEX = 0;
const PYTH_WITHDRAW_SCRIPT_HASH =
  "68a8972304546f254cbf625996c3a9e2ac860f77a9fcd4ee9f73907b";
const PYTH_WITHDRAW_SCRIPT_SIZE = 2745;

let _provider: BlockfrostProvider | null = null;
let _script: {
  script: PlutusScript;
  address: string;
  hash: string;
} | null = null;

function getProvider(): BlockfrostProvider {
  if (!_provider) {
    _provider = new BlockfrostProvider(BLOCKFROST_API_KEY);
  }
  return _provider;
}

export async function createWalletFromMnemonic(
  words: string[],
): Promise<MeshWallet> {
  const wallet = new MeshWallet({
    networkId: NETWORK === "mainnet" ? 1 : 0,
    fetcher: getProvider(),
    submitter: getProvider(),
    key: { type: "mnemonic", words },
  });
  await wallet.init();
  return wallet;
}

export function loadScript() {
  if (_script) return _script;

  const plutusPath = resolve(process.cwd(), "../on-chain/plutus.json");
  const raw = readFileSync(plutusPath, "utf-8");
  const blueprint: Blueprint = JSON.parse(raw);
  const validator = blueprint.validators[0];
  if (!validator) throw new Error(`No validators found in ${plutusPath}`);

  let compiledCode = validator.compiledCode;
  if (PYTH_CONTRACT_POLICY_ID) {
    compiledCode = applyParamsToScript(compiledCode, [PYTH_CONTRACT_POLICY_ID]);
  }

  // applyParamsToScript returns double-CBOR (bytestring(bytestring(FLAT))).
  // MeshTxBuilder strips one layer internally before placing scripts in the
  // witness set, so all APIs (resolveScriptHash, txInScript, etc.) expect
  // the double-CBOR form.
  const script: PlutusScript = { code: compiledCode, version: "V3" };
  const hash = resolveScriptHash(compiledCode, "V3");
  const networkId = NETWORK === "mainnet" ? 1 : 0;
  const { address } = serializePlutusScript(script, undefined, networkId);

  _script = { script, address, hash };
  return _script;
}

export function getScriptAddress(): string {
  return loadScript().address;
}

export function getNetwork(): string {
  return NETWORK.charAt(0).toUpperCase() + NETWORK.slice(1);
}

function encodeDatum(datum: OracleDatum): Data {
  switch (datum.kind) {
    case "AnyPrice":
      return { alternative: 0, fields: [] };
    case "MinPrice":
      return { alternative: 1, fields: [datum.minPriceUsdCents] };
    case "MaxPrice":
      return { alternative: 2, fields: [datum.maxPriceUsdCents] };
    case "PriceRange":
      return { alternative: 3, fields: [datum.loCents, datum.hiCents] };
  }
}

export async function lockOracleUtxo(
  mnemonic: string[],
  datum: OracleDatum,
  lovelace = 2_000_000,
): Promise<string> {
  const wallet = await createWalletFromMnemonic(mnemonic);
  const { address: scriptAddress } = loadScript();

  const encodedDatum: Data = encodeDatum(datum);
  const tx = new Transaction({ initiator: wallet }).sendLovelace(
    {
      address: scriptAddress,
      datum: { value: encodedDatum, inline: true },
    },
    lovelace.toString(),
  );

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  return wallet.submitTx(signedTx);
}

async function fetchPythStateUtxo(): Promise<UTxO> {
  const utxos = await getProvider().fetchUTxOs(
    PYTH_STATE_UTXO_TX_HASH,
    PYTH_STATE_UTXO_TX_INDEX,
  );
  if (utxos.length === 0)
    throw new Error(
      `Pyth state UTxO not found: ${PYTH_STATE_UTXO_TX_HASH}#${PYTH_STATE_UTXO_TX_INDEX}`,
    );
  return utxos[0];
}

/**
 * Build and submit a spend transaction that redeems a script UTxO using a
 * Pyth Lazer price update verified on-chain.
 *
 * Transaction shape (matches the official Pyth Cardano integration docs):
 *   1. Validity window: [now - 60s, now + 60s]
 *   2. Pyth state UTxO as reference input
 *   3. Zero-lovelace withdrawal from Pyth withdraw script with [payload] as redeemer
 *   4. Our validator spending the script UTxO
 */
export async function spendOracleUtxo(
  mnemonic: string[],
  datum: OracleDatum,
  payload: Uint8Array,
): Promise<string> {
  const wallet = await createWalletFromMnemonic(mnemonic);
  const { script, address: scriptAddress } = loadScript();

  const scriptUtxos = await getProvider().fetchAddressUTxOs(scriptAddress);
  if (scriptUtxos.length === 0)
    throw new Error("No UTxOs at oracle script address");

  const pythStateUtxo = await fetchPythStateUtxo();

  const walletAddress = await wallet.getChangeAddress();
  const { pubKeyHash: signerHash } = deserializeAddress(walletAddress);

  const payloadHex = Buffer.from(payload).toString("hex");

  const networkKey = NETWORK === "mainnet" ? "mainnet" : NETWORK;
  const networkId = NETWORK === "mainnet" ? 1 : 0;
  const slotConfig = SLOT_CONFIG_NETWORK[networkKey];

  const now = Date.now();
  const validFrom = unixTimeToEnclosingSlot(now - 60_000, slotConfig);
  const validTo = unixTimeToEnclosingSlot(now + 60_000, slotConfig);

  const targetUtxo = scriptUtxos[0];

  const withdrawRewardAddr = serializeRewardAddress(
    PYTH_WITHDRAW_SCRIPT_HASH,
    true,
    networkId,
  );

  const walletUtxos = await wallet.getUtxos();
  if (walletUtxos.length === 0)
    throw new Error("Wallet has no UTxOs — fund it first");

  const collateralUtxo = walletUtxos.find((u) =>
    u.output.amount.length === 1 &&
    BigInt(u.output.amount[0].quantity) >= 5_000_000n,
  ) ?? walletUtxos[0];

  const txBuilder = new MeshTxBuilder({
    fetcher: getProvider(),
    submitter: getProvider(),
  });

  txBuilder
    .invalidBefore(validFrom)
    .invalidHereafter(validTo)
    .readOnlyTxInReference(
      pythStateUtxo.input.txHash,
      pythStateUtxo.input.outputIndex,
    )
    .withdrawalPlutusScriptV3()
    .withdrawal(withdrawRewardAddr, "0")
    .withdrawalTxInReference(
      PYTH_STATE_UTXO_TX_HASH,
      PYTH_STATE_UTXO_TX_INDEX,
      PYTH_WITHDRAW_SCRIPT_SIZE.toString(),
      PYTH_WITHDRAW_SCRIPT_HASH,
    )
    .withdrawalRedeemerValue([payloadHex], undefined, { mem: 2_000_000, steps: 1_000_000_000 })
    .spendingPlutusScriptV3()
    .txIn(
      targetUtxo.input.txHash,
      targetUtxo.input.outputIndex,
      targetUtxo.output.amount,
      scriptAddress,
    )
    .txInScript(script.code)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ alternative: 0, fields: ["mesh"] }, undefined, { mem: 2_000_000, steps: 1_000_000_000 })
    .txInCollateral(
      collateralUtxo.input.txHash,
      collateralUtxo.input.outputIndex,
      collateralUtxo.output.amount,
      walletAddress,
    )
    .requiredSignerHash(signerHash)
    .changeAddress(walletAddress)
    .selectUtxosFrom(walletUtxos)
    .setNetwork(networkKey);

  const unsignedTx = await txBuilder.complete();
  const signedTx = await wallet.signTx(unsignedTx, true);
  return wallet.submitTx(signedTx);
}

export async function fetchScriptUtxos() {
  return getProvider().fetchAddressUTxOs(getScriptAddress());
}

export function isBlockfrostConfigured(): boolean {
  return !!BLOCKFROST_API_KEY;
}

export async function getWalletBalance(address: string): Promise<string> {
  const utxos = await getProvider().fetchAddressUTxOs(address);
  const total = utxos.reduce((sum, u) => {
    const lovelace = u.output.amount.find(
      (a: { unit: string; quantity: string }) => a.unit === "lovelace",
    );
    return sum + BigInt(lovelace?.quantity ?? "0");
  }, 0n);
  return total.toString();
}
