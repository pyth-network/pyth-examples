import {
  Address,
  Assets,
  Data,
  KeyHash,
  ScriptHash,
  TransactionHash,
  type ProviderOnlyClient,
  type SigningClient,
  type UTxO,
} from "@evolution-sdk/evolution";
import { PlutusV3 } from "@evolution-sdk/evolution/PlutusV3";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { parseAdaUsdPrice } from "../pyth.js";
import { getPythScriptHash, getPythState } from "../pyth_example/index.js";
import type { Config } from "../config.js";

export interface UnlockParams {
  /** Double-CBOR-encoded parameterized Plutus V3 spending script */
  validatorScript?: string;
  /** Backward-compatible fallback: object containing script hex */
  validator?: { script: string };
  /** USD amount in cents (must match the validator parameter) */
  usdAmountCents: bigint;
  /** Bech32 address of the user — receives the ADA equivalent of usdAmountCents */
  userAddress: string;
  /** Bech32 address of the sponsor — receives the remaining ADA */
  sponsorAddress: string;
  /** The UTxO at the script address to spend (if known). If not provided, will be looked up. */
  scriptUtxo?: unknown;
}

/**
 * Computes the lovelace equivalent of usdAmountCents at the given ADA/USD price.
 * Uses ceiling division to match the on-chain validator (rational.ceil).
 * adaUsdPrice is expressed as { numerator, denominator } where price = numerator/denominator.
 */
export function computeLovelaceForUser(
  usdAmountCents: bigint,
  adaUsdNumerator: bigint,
  adaUsdDenominator: bigint,
): bigint {
  // lovelace = ceil(usdAmountCents * 10_000 / ada_usd_price)
  //          = ceil(usdAmountCents * 10_000 * denominator / numerator)
  const dividend = usdAmountCents * 10_000n * adaUsdDenominator;
  // ceil division: (a + b - 1) / b
  return (dividend + adaUsdNumerator - 1n) / adaUsdNumerator;
}

export interface EvolutionPythContext {
  stateUtxo: unknown;
  withdrawScriptHash: string;
}

type UnlockClient = SigningClient & ProviderOnlyClient;

const ADA_USD_FEED_ID = 16;

function requirePaymentKeyHash(address: string): KeyHash.KeyHash {
  const credential = Address.getPaymentCredential(address);
  if (!credential) {
    throw new Error("Invalid bech32 address");
  }
  if (credential._tag !== "KeyHash") {
    throw new Error("Address must use key payment credential");
  }
  return credential;
}

async function getPythContext(
  client: UnlockClient,
  pythPolicyId: string,
): Promise<EvolutionPythContext> {
  const stateUtxo = await getPythState(pythPolicyId, client);
  const withdrawScriptHash = getPythScriptHash(stateUtxo);
  return { stateUtxo, withdrawScriptHash };
}

async function fetchPriceUpdateLikeExample(lazerToken: string): Promise<string> {
  const lazer = await PythLazerClient.create({ token: lazerToken });
  const latestPrice = await lazer.getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: [ADA_USD_FEED_ID],
    properties: ["price", "bestBidPrice", "bestAskPrice", "exponent"],
  });

  if (!latestPrice.solana?.data) {
    throw new Error("Missing update payload");
  }

  return latestPrice.solana.data;
}

function toNetworkId(network: Config["network"]): number {
  return network === "Mainnet" ? 1 : 0;
}

function getValidatorScriptAndAddress(
  validatorScript: string,
  network: Config["network"],
): {
  script: PlutusV3;
  address: Address.Address;
} {
  const script = new PlutusV3({
    bytes: Buffer.from(validatorScript, "hex"),
  });
  const scriptHash = ScriptHash.fromScript(script);
  const address = new Address.Address({
    networkId: toNetworkId(network),
    paymentCredential: scriptHash,
  });
  return { script, address };
}

function resolveValidatorScript(params: UnlockParams): string {
  const script = params.validatorScript ?? params.validator?.script;
  if (!script) {
    throw new Error("Missing validatorScript (or validator.script)");
  }
  return script;
}

/**
 * Builds an unlock transaction with pre-fetched Pyth context and price data.
 * Useful for testing (inject mock data instead of fetching from network).
 *
 * @param currentTime - Optional Unix timestamp in milliseconds to use for validity range.
 */
export async function buildUnlockTxFromData(
  client: UnlockClient,
  config: Config,
  params: UnlockParams,
  pythCtx: EvolutionPythContext,
  priceUpdateHex: string,
  currentTime?: number,
) {
  const validatorScriptHex = resolveValidatorScript(params);
  const { script: validatorScript, address: scriptAddress } = getValidatorScriptAndAddress(
    validatorScriptHex,
    config.network,
  );

  let scriptUtxo = params.scriptUtxo;
  if (!scriptUtxo) {
    const utxos = await client.getUtxos(scriptAddress);
    if (utxos.length === 0) throw new Error("No UTxOs found at script address");
    scriptUtxo = utxos[0];
  }

  const { numerator, denominator } = parseAdaUsdPrice(priceUpdateHex);
  const lovelaceToUser = computeLovelaceForUser(params.usdAmountCents, numerator, denominator);

  const totalLovelace = Assets.lovelaceOf((scriptUtxo as UTxO.UTxO).assets);
  if (lovelaceToUser > totalLovelace) {
    throw new Error(
      `Locked ADA (${totalLovelace}) insufficient for ${lovelaceToUser} lovelace needed`,
    );
  }
  const lovelaceToSponsor = totalLovelace - lovelaceToUser;
  console.log(`Lovelace to user: ${lovelaceToUser}`);
  console.log(`Lovelace to sponsor: ${lovelaceToSponsor}`);

  const now = BigInt(currentTime ?? Date.now());
  const unlockRedeemer = Data.constr(0n, []);
  const updateBytes = Buffer.from(priceUpdateHex, "hex");

  return client
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 60_000n })
    .attachScript({ script: validatorScript })
    .collectFrom({
      inputs: [scriptUtxo as UTxO.UTxO],
      redeemer: unlockRedeemer,
    })
    .readFrom({ referenceInputs: [pythCtx.stateUtxo as UTxO.UTxO] })
    .withdraw({
      amount: 0n,
      redeemer: [updateBytes],
      stakeCredential: ScriptHash.fromHex(pythCtx.withdrawScriptHash),
    })
    .payToAddress({
      address: Address.fromBech32(params.userAddress),
      assets: Assets.fromLovelace(lovelaceToUser),
    })
    .payToAddress({
      address: Address.fromBech32(params.sponsorAddress),
      assets: Assets.fromLovelace(lovelaceToSponsor),
    })
    .addSigner({
      keyHash: requirePaymentKeyHash(params.sponsorAddress),
    })
    .build();
}

/**
 * Builds a transaction that unlocks funds using a live Pyth oracle price.
 */
export async function buildUnlockTx(
  client: UnlockClient,
  config: Config,
  params: UnlockParams,
) {
  const pythCtx = await getPythContext(client, config.pythPolicyId);
  const priceUpdateHex = await fetchPriceUpdateLikeExample(config.pythLazerToken);
  return buildUnlockTxFromData(client, config, params, pythCtx, priceUpdateHex);
}

/**
 * Builds, signs, and submits an unlock transaction.
 * Returns the transaction hash.
 */
export async function unlock(
  client: UnlockClient,
  config: Config,
  params: UnlockParams,
): Promise<string> {
  const tx = await buildUnlockTx(client, config, params);
  const txHash = await tx.signAndSubmit();
  return TransactionHash.toHex(txHash);
}
