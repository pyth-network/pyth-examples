import fs from "fs";
import path from "path";
import { resolveScriptHash } from "@meshsdk/core";

const blueprintPath = path.resolve(
  process.cwd(),
  "..",
  "safequote-app-aiken",
  "plutus.json",
);
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, "utf8"));

const validator = blueprint.validators.find(
  (item) =>
    item.title.endsWith(".mint") && item.title.includes("mint_invoice_nft"),
);

if (!validator) {
  const availableTitles = blueprint.validators.map((item) => item.title);
  throw new Error(
    `Mint validator was not found in plutus.json. Available titles: ${availableTitles.join(", ")}`,
  );
}

const policyId = resolveScriptHash(validator.compiledCode, "V3");
console.log(policyId);
