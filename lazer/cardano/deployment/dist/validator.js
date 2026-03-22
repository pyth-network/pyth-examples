import { applyParamsToScript, applyDoubleCborEncoding, validatorToAddress, Constr, } from "@lucid-evolution/lucid";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const blueprintPath = resolve(__dirname, "../../backend/plutus.json");
function loadBlueprint() {
    const raw = readFileSync(blueprintPath, "utf-8");
    return JSON.parse(raw);
}
const VALIDATOR_TITLE = "pay_with_pyth.pay_with_pyth.spend";
function encodeAddress(paymentKeyHash, stakeKeyHash) {
    const paymentCredential = new Constr(0, [paymentKeyHash]);
    const stakeCredential = stakeKeyHash
        ? new Constr(0, [new Constr(0, [new Constr(0, [stakeKeyHash])])])
        : new Constr(1, []);
    return new Constr(0, [paymentCredential, stakeCredential]);
}
export function getCompiledCode() {
    const blueprint = loadBlueprint();
    const validator = blueprint.validators.find((v) => v.title === VALIDATOR_TITLE);
    if (!validator) {
        throw new Error(`Validator '${VALIDATOR_TITLE}' not found in blueprint`);
    }
    return validator.compiledCode;
}
export function buildValidator(params) {
    const compiledCode = getCompiledCode();
    const userAddress = encodeAddress(params.userPaymentKeyHash, params.userStakeKeyHash);
    const sponsorAddress = encodeAddress(params.sponsorPaymentKeyHash, params.sponsorStakeKeyHash);
    const parameterizedScript = applyParamsToScript(compiledCode, [
        params.usdAmountCents,
        userAddress,
        sponsorAddress,
        params.pythPolicyId,
    ]);
    return {
        type: "PlutusV3",
        script: applyDoubleCborEncoding(parameterizedScript),
    };
}
export function getScriptAddress(validator, network) {
    return validatorToAddress(network, validator);
}
