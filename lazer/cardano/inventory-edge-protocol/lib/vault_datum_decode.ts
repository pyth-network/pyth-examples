import { Constr, type Data } from "@evolution-sdk/evolution/Data";
import * as PolicyId from "@evolution-sdk/evolution/PolicyId";

export type DecodedHedge =
  | { tag: "none" }
  | { tag: "some"; strikeRaw: bigint; payoutLovelace: bigint };

export type DecodedVaultDatum = {
  ownerKeyHashHex: string;
  pythPolicyHex: string;
  nftPolicyHex: string;
  nftNameHex: string;
  debtLovelace: bigint;
  collateralQty: bigint;
  feedId: bigint;
  hedge: DecodedHedge;
};

function bytesToHex(u: Uint8Array): string {
  return Buffer.from(u).toString("hex");
}

function asBytes(d: Data, label: string): Uint8Array {
  if (!(d instanceof Uint8Array)) {
    throw new Error(`${label}: expected bytes`);
  }
  return d;
}

function asBigInt(d: Data, label: string): bigint {
  if (typeof d !== "bigint") {
    throw new Error(`${label}: expected int`);
  }
  return d;
}

function decodeOptionHedge(d: Data): DecodedHedge {
  if (!(d instanceof Constr)) {
    throw new Error("hedge: expected Constr");
  }
  if (d.index === 1n && d.fields.length === 0) {
    return { tag: "none" };
  }
  if (d.index === 0n && d.fields.length === 1) {
    const inner = d.fields[0];
    if (!(inner instanceof Constr) || inner.index !== 0n || inner.fields.length !== 2) {
      throw new Error("hedge Some: bad HedgeParams");
    }
    return {
      tag: "some",
      strikeRaw: asBigInt(inner.fields[0], "strike"),
      payoutLovelace: asBigInt(inner.fields[1], "payout"),
    };
  }
  throw new Error("hedge: unknown option shape");
}

export function decodeVaultDatum(data: Data): DecodedVaultDatum {
  if (!(data instanceof Constr) || data.index !== 0n || data.fields.length !== 8) {
    throw new Error("Not a VaultDatum (Constr 0, 8 fields)");
  }
  const f = data.fields;
  const owner = asBytes(f[0], "owner");
  const pythB = asBytes(f[1], "pyth_policy");
  const nftB = asBytes(f[2], "nft_policy");
  const nameB = asBytes(f[3], "nft_name");
  return {
    ownerKeyHashHex: bytesToHex(owner),
    pythPolicyHex: PolicyId.toHex(PolicyId.fromBytes(pythB)),
    nftPolicyHex: PolicyId.toHex(PolicyId.fromBytes(nftB)),
    nftNameHex: bytesToHex(nameB),
    debtLovelace: asBigInt(f[4], "debt"),
    collateralQty: asBigInt(f[5], "collateral_qty"),
    feedId: asBigInt(f[6], "feed_id"),
    hedge: decodeOptionHedge(f[7]),
  };
}
