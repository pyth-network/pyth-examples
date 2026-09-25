import { Constr, type Data } from "@evolution-sdk/evolution/Data";
import * as PolicyId from "@evolution-sdk/evolution/PolicyId";

export function optionNone(): Data {
  return new Constr({ index: 1n, fields: [] });
}

export function optionSome(inner: Data): Data {
  return new Constr({ index: 0n, fields: [inner] });
}

export function hedgeParams(strikeRaw: bigint, payoutLovelace: bigint): Data {
  return new Constr({
    index: 0n,
    fields: [strikeRaw, payoutLovelace],
  });
}

/** Aiken `VaultDatum` constructor 0 — field order matches on-chain/plutus.json */
/** Aiken `liquidity_pool.PoolDatum` constructor 0 — solo `owner` (28 bytes). */
export function encodePoolDatum(ownerKeyHash: Uint8Array): Data {
  return new Constr({
    index: 0n,
    fields: [ownerKeyHash],
  });
}

export function encodeVaultDatum(params: {
  ownerKeyHash: Uint8Array;
  pythPolicyHex: string;
  nftPolicyHex: string;
  nftNameHex: string;
  debtLovelace: bigint;
  collateralQty: bigint;
  feedId: bigint;
  hedge: Data;
}): Data {
  const pyth = PolicyId.toBytes(PolicyId.fromHex(params.pythPolicyHex));
  const nft = PolicyId.toBytes(PolicyId.fromHex(params.nftPolicyHex));
  const name = Uint8Array.from(Buffer.from(params.nftNameHex, "hex"));
  return new Constr({
    index: 0n,
    fields: [
      params.ownerKeyHash,
      pyth,
      nft,
      name,
      params.debtLovelace,
      params.collateralQty,
      params.feedId,
      params.hedge,
    ],
  });
}

export function redeemerAdjust(newDebt: bigint): Data {
  return new Constr({ index: 0n, fields: [newDebt] });
}

export function redeemerApplyHedge(strike: bigint, payout: bigint): Data {
  return new Constr({ index: 1n, fields: [strike, payout] });
}

export function redeemerClose(): Data {
  return new Constr({ index: 2n, fields: [] });
}

export function redeemerLiquidate(): Data {
  return new Constr({ index: 3n, fields: [] });
}

export function redeemerClaimInsurance(): Data {
  return new Constr({ index: 4n, fields: [] });
}

/** `liquidity_pool`: el validador ignora el redeemer; usamos constructor vacío. */
export function redeemerPoolSpend(): Data {
  return new Constr({ index: 0n, fields: [] });
}

/** Replace hedge field on an existing inline `VaultDatum` Constr. */
export function vaultDatumWithHedge(prev: Data, strike: bigint, payout: bigint): Data {
  if (!(prev instanceof Constr) || prev.index !== 0n) {
    throw new Error("Expected VaultDatum constructor 0");
  }
  const f = prev.fields;
  if (f.length !== 8) throw new Error("Unexpected VaultDatum field count");
  const hedge = optionSome(hedgeParams(strike, payout));
  return new Constr({
    index: 0n,
    fields: [f[0], f[1], f[2], f[3], f[4], f[5], f[6], hedge],
  });
}

/** Replace synthetic debt (Adjust redeemer). */
export function vaultDatumWithDebt(prev: Data, newDebt: bigint): Data {
  if (!(prev instanceof Constr) || prev.index !== 0n) {
    throw new Error("Expected VaultDatum constructor 0");
  }
  const f = prev.fields;
  if (f.length !== 8) throw new Error("Unexpected VaultDatum field count");
  return new Constr({
    index: 0n,
    fields: [f[0], f[1], f[2], f[3], newDebt, f[5], f[6], f[7]],
  });
}
