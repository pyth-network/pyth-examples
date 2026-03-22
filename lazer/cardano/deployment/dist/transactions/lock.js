import { Data, } from "@lucid-evolution/lucid";
import { getScriptAddress } from "../validator.js";
/**
 * Builds a transaction that locks ADA at the script address.
 * The sponsor sends lovelace to the parameterized script address with a Void datum.
 */
export async function buildLockTx(lucid, config, params) {
    const scriptAddress = getScriptAddress(params.validator, config.network);
    const tx = await lucid
        .newTx()
        .pay.ToContract(scriptAddress, { kind: "inline", value: Data.void() }, { lovelace: params.lovelaceAmount })
        .complete();
    return tx;
}
/**
 * Builds, signs, and submits a lock transaction.
 * Returns the transaction hash.
 */
export async function lock(lucid, config, params) {
    const tx = await buildLockTx(lucid, config, params);
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();
    return txHash;
}
