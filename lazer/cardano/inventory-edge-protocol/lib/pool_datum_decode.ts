import { Constr, type Data } from "@evolution-sdk/evolution/Data";

function bytesToHex(u: Uint8Array): string {
  return Buffer.from(u).toString("hex");
}

function asBytes(d: Data, label: string): Uint8Array {
  if (!(d instanceof Uint8Array)) {
    throw new Error(`${label}: expected bytes`);
  }
  return d;
}

/** Decodifica `liquidity_pool.PoolDatum` (solo campo `owner`, 28 bytes). */
export function decodePoolDatumOwnerHex(data: Data): string {
  if (!(data instanceof Constr) || data.index !== 0n || data.fields.length !== 1) {
    throw new Error("Not a PoolDatum (Constr 0, 1 field)");
  }
  return bytesToHex(asBytes(data.fields[0], "owner"));
}
