/**
 * Cardano blockchain service for DevalGuard.
 * Real on-chain transactions via Mesh SDK + CIP-30 wallets.
 */

import {
  BrowserWallet,
  KoiosProvider,
  MeshTxBuilder,
  serializePlutusScript,
  applyParamsToScript,
  applyCborEncoding,
  deserializeAddress,
  deserializeDatum,
  mConStr0,
  mConStr1,
  mConStr2,
  mConStr3,
  stringToHex,
  type PlutusScript,
  type UTxO,
} from "@meshsdk/core";

// @ts-ignore — JSON import
import plutusJson from "../../../plutus.json";

// --- Constants ---

const PYTH_POLICY_ID = "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";
const FEED_ID = 16; // ADA/USD
const PAYOUT_MULTIPLIER = 2;
const POOL_NFT_NAME_STR = "DevalGuard Pool";
const LP_TOKEN_NAME_STR = "DG-LP";
const POOL_NFT_NAME = stringToHex(POOL_NFT_NAME_STR);
const LP_TOKEN_NAME = stringToHex(LP_TOKEN_NAME_STR);

// --- Load validators ---

function findValidator(title: string) {
  const v = (plutusJson as any).validators.find((v: any) => v.title === title);
  if (!v) throw new Error(`Validator "${title}" not found`);
  return v;
}

const poolValidatorRaw = findValidator("liquidity_pool.liquidity_pool.spend");
const policyValidatorRaw = findValidator("policy.policy.spend");

// CBOR-wrap scripts for Mesh SDK tx building
const poolScriptCbor = applyCborEncoding(poolValidatorRaw.compiledCode);

const poolScript: PlutusScript = {
  code: poolScriptCbor,
  version: "V3",
};

const POOL_SCRIPT_HASH = poolValidatorRaw.hash;

// Apply ProtocolConfig params to policy validator
const policyScriptApplied = applyParamsToScript(
  applyCborEncoding(policyValidatorRaw.compiledCode),
  [mConStr0([PYTH_POLICY_ID, POOL_SCRIPT_HASH, FEED_ID, PAYOUT_MULTIPLIER])]
);

const policyScript: PlutusScript = {
  code: policyScriptApplied,
  version: "V3",
};

const POLICY_SCRIPT_HASH = serializePlutusScript(policyScript, undefined, 0).address
  ? (() => {
      // Extract hash from the serialized script
      const { address } = serializePlutusScript(policyScript, undefined, 0);
      return address;
    })()
  : "";

// --- Provider ---
// KoiosProvider with axios baseURL overridden to use Vite proxy (avoids CORS)
const provider = new KoiosProvider("preprod");
// Override the axios instance to route through our Vite proxy
(provider as any)._axiosInstance.defaults.baseURL = "/koios/api/v1";

// --- Wallet ---

let wallet: BrowserWallet | null = null;
let walletAddress: string = "";

export async function connectWallet(): Promise<string> {
  const available = await BrowserWallet.getAvailableWallets();
  if (available.length === 0) throw new Error("No CIP-30 wallet found");

  const preferred = ["eternl", "nami", "lace"];
  const name =
    preferred.find((n) => available.some((w) => w.name.toLowerCase() === n)) ??
    available[0].name;

  wallet = await BrowserWallet.enable(name);
  const addrs = await wallet.getUsedAddresses();
  walletAddress = addrs[0] ?? (await wallet.getUnusedAddresses())[0] ?? "";
  return walletAddress;
}

export function getWallet(): BrowserWallet {
  if (!wallet) throw new Error("Wallet not connected");
  return wallet;
}

export function getWalletAddress(): string {
  return walletAddress;
}

export function getWalletPkh(): string {
  if (!walletAddress) return "";
  try {
    return deserializeAddress(walletAddress).pubKeyHash;
  } catch {
    return "";
  }
}

// --- Script Addresses ---

export function getPoolAddress(): string {
  return serializePlutusScript(poolScript, undefined, 0).address;
}

export function getPolicyAddress(): string {
  return serializePlutusScript(policyScript, undefined, 0).address;
}

// --- Helper: get wallet UTxOs + collateral ---

async function getTxContext() {
  const w = getWallet();
  const utxos = await w.getUtxos();
  const changeAddr = await w.getChangeAddress();
  let collateral: UTxO[] = [];
  try {
    collateral = await w.getCollateral();
  } catch {}
  // If wallet doesn't expose collateral, pick a suitable UTxO (>5 ADA, no tokens)
  if (!collateral || collateral.length === 0) {
    const candidate = utxos.find(
      (u) => u.output.amount.length === 1 && Number(u.output.amount[0].quantity) >= 5_000_000
    );
    if (candidate) collateral = [candidate];
  }
  if (collateral.length === 0) {
    throw new Error("No suitable collateral UTxO found. Need a UTxO with >= 5 ADA and no tokens.");
  }
  return { utxos, changeAddr, collateral };
}

// --- 1. Initialize Pool ---

export async function initPool(depositLovelace: number): Promise<string> {
  const { utxos, changeAddr, collateral } = await getTxContext();
  const poolAddr = getPoolAddress();

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    evaluator: provider,
  });

  // Pool datum: constructor 0 [total_deposits, total_reserved, total_premiums_earned]
  const poolDatum = mConStr0([depositLovelace, 0, 0]);

  // Mint 1 pool NFT using the pool script (mint handler)
  txBuilder
    .mintPlutusScriptV3()
    .mint("1", POOL_SCRIPT_HASH, POOL_NFT_NAME)
    .mintingScript(poolScriptCbor)
    .mintRedeemerValue(mConStr0([]))

    // Send to pool address with NFT + deposit + inline datum
    .txOut(poolAddr, [
      { unit: "lovelace", quantity: String(depositLovelace) },
      { unit: POOL_SCRIPT_HASH + POOL_NFT_NAME, quantity: "1" },
    ])
    .txOutInlineDatumValue(poolDatum)

    // Collateral
    .txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address
    )

    .changeAddress(changeAddr)
    .selectUtxosFrom(utxos);

  const unsignedTx = await txBuilder.complete();
  const signedTx = await getWallet().signTx(unsignedTx);
  const txHash = await getWallet().submitTx(signedTx);

  console.log("Pool initialized:", txHash);
  return txHash;
}

// --- 1b. Deposit to Pool ---

export async function depositToPool(depositLovelace: number): Promise<string> {
  const { utxos, changeAddr, collateral } = await getTxContext();
  const poolUtxo = await findPoolUtxo();
  if (!poolUtxo) throw new Error("Pool not found on-chain");

  const poolAddr = getPoolAddress();

  // Parse current pool datum
  const poolFields = parsePoolFields(poolUtxo.output.plutusData);
  if (!poolFields) throw new Error("Cannot parse pool datum");
  const [currentDeposits, currentReserved, currentPremiums] = poolFields;

  // Current pool lovelace
  const currentLovelace = Number(
    poolUtxo.output.amount.find((a) => a.unit === "lovelace")?.quantity ?? 0
  );

  // Deposit handler: total_deposits += amount, rest unchanged
  const newPoolDatum = mConStr0([
    currentDeposits + depositLovelace,
    currentReserved,
    currentPremiums,
  ]);

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    evaluator: provider,
  });

  txBuilder
    // Spend pool UTxO (Deposit redeemer = constructor 0)
    .spendingPlutusScriptV3()
    .txIn(poolUtxo.input.txHash, poolUtxo.input.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(mConStr0([]))
    .txInScript(poolScriptCbor)

    // Mint LP tokens = deposit amount
    .mintPlutusScriptV3()
    .mint(String(depositLovelace), POOL_SCRIPT_HASH, LP_TOKEN_NAME)
    .mintingScript(poolScriptCbor)
    .mintRedeemerValue(mConStr0([]))

    // Recreate pool UTxO with more lovelace + updated datum
    .txOut(poolAddr, [
      { unit: "lovelace", quantity: String(currentLovelace + depositLovelace) },
      { unit: POOL_SCRIPT_HASH + POOL_NFT_NAME, quantity: "1" },
    ])
    .txOutInlineDatumValue(newPoolDatum)

    // Collateral
    .txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address
    )

    .changeAddress(changeAddr)
    .selectUtxosFrom(utxos);

  const unsignedTx = await txBuilder.complete();
  const signedTx = await getWallet().signTx(unsignedTx);
  const txHash = await getWallet().submitTx(signedTx);

  // Update known pool tx to the new one
  (window as any).__lastPoolTx = txHash;
  console.log("Deposit to pool:", txHash);
  return txHash;
}

// --- 2. Find Pool UTxO ---

// Fetch UTxOs via Vite proxy to avoid CORS issues
async function fetchUtxosDirect(address: string): Promise<UTxO[]> {
  // Try Mesh provider first (works after wallet connects, uses wallet's provider)
  try {
    const utxos = await provider.fetchAddressUTxOs(address);
    if (utxos.length > 0) return utxos;
  } catch {}

  // Fallback: use Koios via Vite proxy (no CORS issues)
  try {
    const res = await fetch("/koios/api/v1/address_utxos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _addresses: [address], _extended: true }),
    });
    if (!res.ok) return [];
    const data = await res.json();

    return data.map((u: any) => ({
      input: { txHash: u.tx_hash, outputIndex: u.tx_index },
      output: {
        address,
        amount: [
          { unit: "lovelace", quantity: u.value },
          ...(u.asset_list ?? []).map((a: any) => ({
            unit: a.policy_id + a.asset_name,
            quantity: a.quantity,
          })),
        ],
        plutusData: u.inline_datum ?? null,
        dataHash: u.datum_hash ?? null,
      },
    }));
  } catch (e) {
    console.warn("Koios proxy fallback failed:", e);
    return [];
  }
}

// Skip known broken pool UTxOs (from failed inits during development).
// Set via VITE_SKIP_POOL_TX env var, or leave empty for fresh deployments.
const BROKEN_POOL_TX = import.meta.env.VITE_SKIP_POOL_TX ?? "";

export async function findPoolUtxo(): Promise<UTxO | null> {
  const poolAddr = getPoolAddress();
  try {
    const utxos = await fetchUtxosDirect(poolAddr);
    const nftUnit = POOL_SCRIPT_HASH + POOL_NFT_NAME;

    // Filter out the known broken UTxO, then pick the one with NFT
    const valid = utxos.filter((u) => u.input.txHash !== BROKEN_POOL_TX);
    const withNft = valid.filter((u) =>
      u.output.amount.some((a) => a.unit === nftUnit)
    );
    if (withNft.length > 0) return withNft[withNft.length - 1];

    // Fallback: any valid UTxO with datum
    return valid.find((u) => u.output.plutusData) ?? null;
  } catch (e) {
    console.warn("findPoolUtxo error:", e);
    return null;
  }
}

// --- 3. Subscribe (create policy) ---

export async function subscribe(
  thresholdBps: number,
  premiumLovelace: number,
  coveragePeriodMs: number,
  strikePrice: number,
  strikeExponent: number,
): Promise<string> {
  const { utxos, changeAddr, collateral } = await getTxContext();
  const poolUtxo = await findPoolUtxo();
  if (!poolUtxo) throw new Error("Pool not initialized on-chain");

  const policyAddr = getPolicyAddress();
  const poolAddr = getPoolAddress();
  const payoutAmount = premiumLovelace * PAYOUT_MULTIPLIER;
  const expiryTime = Date.now() + coveragePeriodMs;

  // Parse current pool datum
  const poolFields = parsePoolFields(poolUtxo.output.plutusData);
  if (!poolFields) throw new Error("Cannot parse pool datum");
  const [currentDeposits, currentReserved, currentPremiums] = poolFields;

  // ReserveIncrease only changes total_reserved — deposits and premiums stay same
  // (pool validator enforces this strictly)
  const newPoolDatum = mConStr0([
    currentDeposits,
    currentReserved + payoutAmount,
    currentPremiums,
  ]);

  // Policy datum: constructor 0 [owner (pkh), strike_price, strike_exponent, threshold_bps,
  //   premium_paid, payout_amount, expiry_slot, feed_id, status(Active=constr0)]
  const { pubKeyHash: ownerPkh } = deserializeAddress(walletAddress);
  const policyDatum = mConStr0([
    ownerPkh,
    strikePrice,
    strikeExponent,
    thresholdBps,
    premiumLovelace,
    payoutAmount,
    expiryTime,
    FEED_ID,
    mConStr0([]), // Active status
  ]);

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    evaluator: provider,
  });

  txBuilder
    // Spend pool UTxO (ReserveIncrease redeemer = constructor 2 [amount])
    .spendingPlutusScriptV3()
    .txIn(poolUtxo.input.txHash, poolUtxo.input.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(mConStr2([payoutAmount]))
    .txInScript(poolScriptCbor)

    // Recreate pool UTxO with same value + updated datum (ReserveIncrease doesn't change lovelace)
    .txOut(poolAddr, [
      { unit: "lovelace", quantity: String(currentDeposits) },
      { unit: POOL_SCRIPT_HASH + POOL_NFT_NAME, quantity: "1" },
    ])
    .txOutInlineDatumValue(newPoolDatum)

    // Create policy UTxO
    .txOut(policyAddr, [
      { unit: "lovelace", quantity: "2000000" }, // min UTxO
    ])
    .txOutInlineDatumValue(policyDatum)

    // Collateral
    .txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address
    )

    .changeAddress(changeAddr)
    .selectUtxosFrom(utxos);

  const unsignedTx = await txBuilder.complete();
  const signedTx = await getWallet().signTx(unsignedTx);
  const txHash = await getWallet().submitTx(signedTx);

  console.log("Policy subscribed:", txHash);
  return txHash;
}

// --- 4. Claim ---

export async function claim(policyUtxo: UTxO): Promise<string> {
  const { utxos, changeAddr, collateral } = await getTxContext();
  const poolUtxo = await findPoolUtxo();
  if (!poolUtxo) throw new Error("Pool not found");

  const poolAddr = getPoolAddress();

  // Parse pool datum
  const poolFields = parsePoolFields(poolUtxo.output.plutusData);
  if (!poolFields) throw new Error("Cannot parse pool datum");
  const [currentDeposits, currentReserved, currentPremiums] = poolFields;

  // For now, use the payout from the UI (passed as parameter)
  // TODO: parse from policy datum CBOR
  const payoutAmount = currentReserved; // claim all reserved

  // New pool datum: deposits - payout, reserved - payout
  const newPoolDatum = mConStr0([
    currentDeposits - payoutAmount,
    currentReserved - payoutAmount,
    currentPremiums,
  ]);

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    evaluator: provider,
  });

  txBuilder
    // Spend policy UTxO (Claim redeemer = constructor 1)
    .spendingPlutusScriptV3()
    .txIn(policyUtxo.input.txHash, policyUtxo.input.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(mConStr1([]))
    .txInScript(policyScriptApplied)

    // Spend pool UTxO (ReserveDecrease redeemer = constructor 3 [amount])
    .spendingPlutusScriptV3()
    .txIn(poolUtxo.input.txHash, poolUtxo.input.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(mConStr3([payoutAmount]))
    .txInScript(poolScriptCbor)

    // Recreate pool with updated datum
    .txOut(poolAddr, [
      { unit: "lovelace", quantity: String(currentDeposits - payoutAmount) },
      { unit: POOL_SCRIPT_HASH + POOL_NFT_NAME, quantity: "1" },
    ])
    .txOutInlineDatumValue(newPoolDatum)

    // Payout to user
    .txOut(walletAddress, [
      { unit: "lovelace", quantity: String(payoutAmount) },
    ])

    // Collateral
    .txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address
    )

    .changeAddress(changeAddr)
    .selectUtxosFrom(utxos);

  const unsignedTx = await txBuilder.complete();
  const signedTx = await getWallet().signTx(unsignedTx);
  const txHash = await getWallet().submitTx(signedTx);

  console.log("Claim executed:", txHash);
  return txHash;
}

// --- Datum parsing ---

// Parse PoolDatum from Mesh's plutusData (CBOR hex string or JSON object)
function parsePoolFields(plutusData: any): [number, number, number] | null {
  if (!plutusData) return null;

  // Mesh returns CBOR hex string like "d8799f1a02faf0800000ff"
  if (typeof plutusData === "string") {
    try {
      const parsed = deserializeDatum(plutusData);
      if (parsed && typeof parsed === "object" && "fields" in parsed) {
        const fields = (parsed as any).fields;
        return [Number(fields[0]?.int ?? fields[0]), Number(fields[1]?.int ?? fields[1]), Number(fields[2]?.int ?? fields[2])];
      }
    } catch {}

    // Fallback: manual CBOR parse for our specific datum shape
    // d8799f <int> <int> <int> ff = constructor 0, indefinite array, 3 ints
    try {
      const hex = plutusData;
      if (hex.startsWith("d8799f") && hex.endsWith("ff")) {
        const inner = hex.slice(6, -2);
        const ints = parseCborInts(inner);
        if (ints.length === 3) return [ints[0], ints[1], ints[2]];
      }
    } catch {}
  }

  // JSON object format (Mesh SDK or Koios)
  if (typeof plutusData === "object") {
    // Koios extended format: { bytes: "...", value: { fields: [...] } }
    const fields = plutusData?.value?.fields ?? plutusData?.fields ?? plutusData;
    if (Array.isArray(fields) && fields.length >= 3) {
      return [Number(fields[0]?.int ?? fields[0]), Number(fields[1]?.int ?? fields[1]), Number(fields[2]?.int ?? fields[2])];
    }
  }

  return null;
}

// Simple CBOR integer parser for our datum
function parseCborInts(hex: string): number[] {
  const ints: number[] = [];
  let i = 0;
  while (i < hex.length) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (byte <= 0x17) {
      ints.push(byte);
      i += 2;
    } else if (byte === 0x18) {
      ints.push(parseInt(hex.slice(i + 2, i + 4), 16));
      i += 4;
    } else if (byte === 0x19) {
      ints.push(parseInt(hex.slice(i + 2, i + 6), 16));
      i += 6;
    } else if (byte === 0x1a) {
      ints.push(parseInt(hex.slice(i + 2, i + 10), 16));
      i += 10;
    } else if (byte === 0x1b) {
      ints.push(Number(BigInt("0x" + hex.slice(i + 2, i + 18))));
      i += 18;
    } else if (byte === 0x00) {
      ints.push(0);
      i += 2;
    } else {
      i += 2; // skip unknown
    }
  }
  return ints;
}

// --- Pool Stats ---

export interface OnChainPoolStats {
  totalDeposits: number;
  totalReserved: number;
  premiumsEarned: number;
  txHash: string;
}

export async function fetchPoolStats(): Promise<OnChainPoolStats | null> {
  const utxo = await findPoolUtxo();
  console.log("[fetchPoolStats] utxo:", utxo?.input.txHash?.slice(0, 16), "plutusData:", utxo?.output.plutusData);
  if (!utxo) return null;

  const fields = parsePoolFields(utxo.output.plutusData);
  console.log("[fetchPoolStats] parsed fields:", fields);
  if (!fields) return null;

  return {
    totalDeposits: fields[0],
    totalReserved: fields[1],
    premiumsEarned: fields[2],
    txHash: utxo.input.txHash,
  };
}

// --- Fetch on-chain policies ---

export interface OnChainPolicy {
  txHash: string;
  outputIndex: number;
  owner: string;
  strikePrice: number;
  strikeExponent: number;
  thresholdBps: number;
  premiumPaid: number;
  payoutAmount: number;
  expiryTime: number;
  feedId: number;
  status: "Active" | "Claimed" | "Expired";
}

export async function fetchPolicies(): Promise<OnChainPolicy[]> {
  const policyAddr = getPolicyAddress();
  try {
    const utxos = await fetchUtxosDirect(policyAddr);
    const policies: OnChainPolicy[] = [];

    for (const u of utxos) {
      try {
        const datum = u.output.plutusData;
        if (!datum) continue;

        let fields: any[];

        if (typeof datum === "object" && datum.value?.fields) {
          fields = datum.value.fields;
        } else if (typeof datum === "object" && datum.fields) {
          fields = datum.fields;
        } else if (typeof datum === "string") {
          const parsed = deserializeDatum(datum);
          fields = (parsed as any)?.fields ?? [];
        } else {
          continue;
        }

        if (fields.length < 9) continue;

        // Parse status from constructor index
        // Parse status constructor index
        // Mesh deserializeDatum returns BigInt for constructor index
        const statusField = fields[8];
        let statusIdx = 0;
        if (typeof statusField === "object" && statusField !== null) {
          const raw = statusField.alternative ?? (Object.hasOwn(statusField, "constructor") ? statusField["constructor"] : 0);
          statusIdx = Number(raw);
        }
        const status = statusIdx === 0 ? "Active" : statusIdx === 1 ? "Claimed" : "Expired";

        policies.push({
          txHash: u.input.txHash,
          outputIndex: u.input.outputIndex,
          owner: fields[0]?.bytes ?? fields[0] ?? "",
          strikePrice: Number(fields[1]?.int ?? fields[1] ?? 0),
          strikeExponent: Number(fields[2]?.int ?? fields[2] ?? 0),
          thresholdBps: Number(fields[3]?.int ?? fields[3] ?? 0),
          premiumPaid: Number(fields[4]?.int ?? fields[4] ?? 0),
          payoutAmount: Number(fields[5]?.int ?? fields[5] ?? 0),
          expiryTime: Number(fields[6]?.int ?? fields[6] ?? 0),
          feedId: Number(fields[7]?.int ?? fields[7] ?? 0),
          status,
        });
      } catch (e) {
        console.warn("Failed to parse policy UTxO:", u.input.txHash, e);
      }
    }

    return policies;
  } catch (e) {
    console.warn("fetchPolicies error:", e);
    return [];
  }
}

// --- Exports ---

export {
  POOL_SCRIPT_HASH,
  POOL_NFT_NAME,
  LP_TOKEN_NAME,
  PYTH_POLICY_ID,
  FEED_ID,
  PAYOUT_MULTIPLIER,
  provider,
  poolScript,
  policyScript,
};
