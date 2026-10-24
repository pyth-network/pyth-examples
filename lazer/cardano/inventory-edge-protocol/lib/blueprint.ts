import { readFileSync } from "node:fs";
import { PLUTUS_JSON } from "./paths.js";

export type BlueprintValidator = {
  title: string;
  compiledCode: string;
  hash: string;
};

export type Blueprint = {
  validators: BlueprintValidator[];
};

export function loadBlueprint(): Blueprint {
  const raw = readFileSync(PLUTUS_JSON, "utf8");
  return JSON.parse(raw) as Blueprint;
}

export function vaultSpendValidator(blueprint: Blueprint): BlueprintValidator {
  const v = blueprint.validators.find((x) => x.title === "vault.vault.spend");
  if (!v) throw new Error("vault.vault.spend not found in plutus.json — run: npm run build:onchain");
  return v;
}

export function liquidityPoolSpendValidator(
  blueprint: Blueprint,
): BlueprintValidator {
  const v = blueprint.validators.find(
    (x) => x.title === "liquidity_pool.liquidity_pool.spend",
  );
  if (!v) {
    throw new Error(
      "liquidity_pool.liquidity_pool.spend not found in plutus.json — run: npm run build:onchain",
    );
  }
  return v;
}
