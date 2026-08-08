import * as Address from "@evolution-sdk/evolution/Address";
import * as Credential from "@evolution-sdk/evolution/Credential";
import * as KeyHash from "@evolution-sdk/evolution/KeyHash";
import * as ScriptHash from "@evolution-sdk/evolution/ScriptHash";

/** PreProd / testnet enterprise script address from validator blake2b-224 script hash (hex). */
export function enterpriseVaultAddress(scriptHashHex: string): Address.Address {
  const sh = ScriptHash.fromHex(scriptHashHex);
  return new Address.Address({
    networkId: 0,
    paymentCredential: Credential.makeScriptHash(ScriptHash.toBytes(sh)),
  });
}

export function paymentKeyHashBytes(addr: Address.Address): Uint8Array {
  const p = addr.paymentCredential;
  if (p._tag !== "KeyHash") {
    throw new Error("Expected a payment key address (enterprise or base with vkey payment)");
  }
  return KeyHash.toBytes(p);
}
