import {
  Constr,
  Data,
  type LucidEvolution,
  type SpendingValidator,
  type TxBuilder,
  type TxSignBuilder,
  type UTxO,
} from "@lucid-evolution/lucid";
import { getScriptAddress } from "../validator.js";
import {
  buildWithdrawRedeemer,
  fetchPriceUpdate,
  getPythContext,
  parseAdaUsdPrice,
  type PythContext,
} from "../pyth.js";
import type { Config } from "../config.js";

export interface UnlockParams {
  /** The parameterized spending validator */
  validator: SpendingValidator;
  /** USD amount in cents (must match the validator parameter) */
  usdAmountCents: bigint;
  /** Bech32 address of the user — receives the ADA equivalent of usdAmountCents */
  userAddress: string;
  /** Bech32 address of the sponsor — receives the remaining ADA */
  sponsorAddress: string;
  /** The UTxO at the script address to spend (if known). If not provided, will be looked up. */
  scriptUtxo?: UTxO;
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

/**
 * Builds an unlock transaction with pre-fetched Pyth context and price data.
 * Useful for testing (inject mock data instead of fetching from network).
 *
 * @param currentTime - Optional Unix timestamp in milliseconds to use for validity range.
 *                      Defaults to Date.now(). Pass the emulator's current time when testing
 *                      with the Lucid Emulator to avoid slot range validation errors.
 */
export async function buildUnlockTxFromData(
  lucid: LucidEvolution,
  config: Config,
  params: UnlockParams,
  pythCtx: PythContext,
  priceUpdateHex: string,
  currentTime?: number,
): Promise<TxSignBuilder> {
  const scriptAddress = getScriptAddress(params.validator, config.network);

  let scriptUtxo = params.scriptUtxo;
  if (!scriptUtxo) {
    const utxos = await lucid.utxosAt(scriptAddress);
    if (utxos.length === 0) throw new Error("No UTxOs found at script address");
    scriptUtxo = utxos[0];
  }

  const { numerator, denominator } = parseAdaUsdPrice(priceUpdateHex);
  const withdrawRedeemer = buildWithdrawRedeemer(priceUpdateHex);
  const lovelaceToUser = computeLovelaceForUser(params.usdAmountCents, numerator, denominator);

  const totalLovelace = scriptUtxo.assets.lovelace ?? 0n;
  if (lovelaceToUser > totalLovelace) {
    throw new Error(
      `Locked ADA (${totalLovelace}) insufficient for ${lovelaceToUser} lovelace needed`,
    );
  }
  const lovelaceToSponsor = totalLovelace - lovelaceToUser;

  const unlockRedeemer = Data.to(new Constr(0, []));
  const now = BigInt(currentTime ?? Date.now());

  const refUtxos: UTxO[] = [
    pythCtx.stateUtxo,
    ...(pythCtx.withdrawRefUtxo ? [pythCtx.withdrawRefUtxo] : []),
  ];

  let builder: TxBuilder = lucid
    .newTx()
    .collectFrom([scriptUtxo], unlockRedeemer)
    .attach.SpendingValidator(params.validator)
    .readFrom(refUtxos)
    .withdraw(pythCtx.rewardAddress, 0n, withdrawRedeemer)
    .pay.ToAddress(params.userAddress, { lovelace: lovelaceToUser })
    .pay.ToAddress(params.sponsorAddress, { lovelace: lovelaceToSponsor })
    .validFrom(Number(now - 60_000n))
    .validTo(Number(now + 60_000n))
    .addSigner(params.sponsorAddress);

  if (pythCtx.withdrawValidator) {
    builder = builder.attach.WithdrawalValidator(pythCtx.withdrawValidator);
  }

  return builder.complete();
}

/**
 * Builds a transaction that unlocks funds using a live Pyth oracle price.
 */
export async function buildUnlockTx(
  lucid: LucidEvolution,
  config: Config,
  params: UnlockParams,
): Promise<TxSignBuilder> {
  const pythCtx = await getPythContext(lucid, config.pythPolicyId, config.network);
  const priceUpdateHex = await fetchPriceUpdate(config.pythLazerToken);
  return buildUnlockTxFromData(lucid, config, params, pythCtx, priceUpdateHex);
}

/**
 * Builds, signs, and submits an unlock transaction.
 * Returns the transaction hash.
 */
export async function unlock(
  lucid: LucidEvolution,
  config: Config,
  params: UnlockParams,
): Promise<string> {
  const tx = await buildUnlockTx(lucid, config, params);
  const signed = await tx.sign.withWallet().complete();
  return signed.submit();
}
