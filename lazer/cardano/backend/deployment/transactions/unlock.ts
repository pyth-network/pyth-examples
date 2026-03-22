import {
  Constr,
  Data,
  type LucidEvolution,
  type SpendingValidator,
  type TxSignBuilder,
  type UTxO,
} from "@lucid-evolution/lucid";
import { getScriptAddress } from "../validator.js";
import {
  buildWithdrawRedeemer,
  fetchPriceUpdate,
  getPythContext,
  parseAdaUsdPrice,
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
function computeLovelaceForUser(
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
 * Builds a transaction that unlocks funds from the script using Pyth oracle price.
 *
 * The transaction:
 * - Spends the script UTxO with the Unlock redeemer
 * - Includes the Pyth State UTxO as a reference input
 * - Includes a zero-withdrawal from the Pyth withdraw script (price verification)
 * - Explicitly sends the ADA/USD equivalent to the user address
 * - Sends the remainder back to the sponsor address
 * - Sets a tight validity range (required by Pyth trusted signer checks)
 */
export async function buildUnlockTx(
  lucid: LucidEvolution,
  config: Config,
  params: UnlockParams,
): Promise<TxSignBuilder> {
  const scriptAddress = getScriptAddress(params.validator, config.network);

  // Find the script UTxO to spend
  let scriptUtxo = params.scriptUtxo;
  if (!scriptUtxo) {
    const utxos = await lucid.utxosAt(scriptAddress);
    if (utxos.length === 0) {
      throw new Error("No UTxOs found at script address");
    }
    scriptUtxo = utxos[0];
  }

  // Get Pyth on-chain state
  const pythCtx = await getPythContext(
    lucid,
    config.pythPolicyId,
    config.network,
  );

  // Fetch latest price update and parse the ADA/USD price
  const priceUpdateHex = await fetchPriceUpdate(config.pythLazerToken);
  const { numerator, denominator } = parseAdaUsdPrice(priceUpdateHex);
  const withdrawRedeemer = buildWithdrawRedeemer(priceUpdateHex);

  // Compute how much lovelace the user should receive (mirrors on-chain logic)
  const lovelaceToUser = computeLovelaceForUser(
    params.usdAmountCents,
    numerator,
    denominator,
  );

  const totalLovelace = scriptUtxo.assets.lovelace ?? 0n;
  if (lovelaceToUser > totalLovelace) {
    throw new Error(
      `Locked ADA (${totalLovelace} lovelace) is insufficient to cover ` +
        `the USD amount at the current price (${lovelaceToUser} lovelace needed)`,
    );
  }
  const lovelaceToSponsor = totalLovelace - lovelaceToUser;

  // Unlock redeemer = Constr(0, []) — first variant of Action
  const unlockRedeemer = Data.to(new Constr(0, []));

  // Build transaction with tight validity range (required by Pyth)
  const now = BigInt(Date.now());
  const tx = await lucid
    .newTx()
    .collectFrom([scriptUtxo], unlockRedeemer)
    .attach.SpendingValidator(params.validator)
    .attach.WithdrawalValidator(pythCtx.withdrawValidator)
    .readFrom([pythCtx.stateUtxo])
    .withdraw(pythCtx.rewardAddress, 0n, withdrawRedeemer)
    // Explicit outputs — must satisfy the on-chain validator checks
    .pay.ToAddress(params.userAddress, { lovelace: lovelaceToUser })
    .pay.ToAddress(params.sponsorAddress, { lovelace: lovelaceToSponsor })
    .validFrom(Number(now - 60_000n))
    .validTo(Number(now + 60_000n))
    .addSigner(params.sponsorAddress)
    .complete();

  return tx;
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
  const txHash = await signed.submit();
  return txHash;
}
