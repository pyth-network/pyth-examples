import {
  applyParamsToScript,
  applyDoubleCborEncoding,
  validatorToAddress,
  Constr,
  type Data,
  type SpendingValidator,
  type Network,
} from "@lucid-evolution/lucid";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const blueprintPath = resolve(__dirname, "../plutus.json");

interface Blueprint {
  validators: Array<{
    title: string;
    compiledCode: string;
    hash: string;
  }>;
}

function loadBlueprint(): Blueprint {
  const raw = readFileSync(blueprintPath, "utf-8");
  return JSON.parse(raw) as Blueprint;
}

const VALIDATOR_TITLE = "pay_with_pyth.pay_with_pyth.spend";

export interface ValidatorParams {
  usdAmountCents: bigint;
  userPaymentKeyHash: string;
  userStakeKeyHash?: string;
  sponsorPaymentKeyHash: string;
  sponsorStakeKeyHash?: string;
  pythPolicyId: string;
}

function encodeAddress(
  paymentKeyHash: string,
  stakeKeyHash?: string,
): Constr<Data> {
  const paymentCredential: Constr<Data> = new Constr(0, [paymentKeyHash]);
  const stakeCredential: Constr<Data> = stakeKeyHash
    ? new Constr(0, [new Constr(0, [new Constr(0, [stakeKeyHash])])])
    : new Constr(1, []);
  return new Constr(0, [paymentCredential, stakeCredential]);
}

export function getCompiledCode(): string {
  const blueprint = loadBlueprint();
  const validator = blueprint.validators.find(
    (v) => v.title === VALIDATOR_TITLE,
  );
  if (!validator) {
    throw new Error(`Validator '${VALIDATOR_TITLE}' not found in blueprint`);
  }
  return validator.compiledCode;
}

export function buildValidator(params: ValidatorParams): SpendingValidator {
  const compiledCode = getCompiledCode();

  const userAddress = encodeAddress(
    params.userPaymentKeyHash,
    params.userStakeKeyHash,
  );
  const sponsorAddress = encodeAddress(
    params.sponsorPaymentKeyHash,
    params.sponsorStakeKeyHash,
  );

  const parameterizedScript = applyParamsToScript(compiledCode, [
    params.usdAmountCents,
    userAddress,
    sponsorAddress,
    params.pythPolicyId,
  ]);

  console.log("Parameterized script:", parameterizedScript);
  return {
    type: "PlutusV3",
    script: applyDoubleCborEncoding(parameterizedScript),
  };
}

export function getScriptAddress(
  validator: SpendingValidator,
  network: Network,
): string {
  return validatorToAddress(network, validator);
}
