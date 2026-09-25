import {
  applyCborEncoding,
  resolvePlutusScriptAddress,
  resolveScriptHash,
} from "@meshsdk/core";
import appliedBlueprint from "../../aiken/plutus.applied.json";
import { PYTH_POLICY_ID, ADA_USD_FEED_ID } from "./pyth";

type AppliedValidator = {
  title: string;
  compiledCode: string;
  hash?: string;
};

const spendValidator = (appliedBlueprint.validators as AppliedValidator[]).find(
  (validator) => validator.title === "iron_pig.iron_pig.spend",
);

if (!spendValidator?.compiledCode) {
  throw new Error("Missing spend validator in aiken/plutus.applied.json");
}

// Mesh expects CBOR-encoded script bytes for hashing/address/witnessing.
const SPEND_SCRIPT_CBOR = applyCborEncoding(spendValidator.compiledCode);

export const COMPILED_SCRIPT = SPEND_SCRIPT_CBOR;
export const SCRIPT_HASH =
  spendValidator.hash ?? resolveScriptHash(SPEND_SCRIPT_CBOR, "V3");
export const SCRIPT_ADDRESS = resolvePlutusScriptAddress(
  { code: SPEND_SCRIPT_CBOR, version: "V3" },
  0,
);

export const LOVELACE_PER_ADA = 1_000_000;
export const MICRO_USD_PER_USD = 1_000_000;

// Construct the IronPigDatum as Plutus constr(0, [...])
// Fields: goal_micro_usd, owner, pyth_policy_id, ada_usd_feed_id (Int)
export function buildIronPigDatum(
  goalUsd: number,
  ownerVkh: string,
  pythPolicyId: string = PYTH_POLICY_ID,
  feedId: number = ADA_USD_FEED_ID,
) {
  return {
    alternative: 0,
    fields: [
      goalUsd * MICRO_USD_PER_USD,
      ownerVkh,
      pythPolicyId,
      feedId,
    ],
  };
}

// Redeemers
export const REDEEMER_DEPOSIT = { alternative: 0, fields: [] };
export const REDEEMER_WITHDRAW = { alternative: 1, fields: [] };
