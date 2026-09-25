import blueprint from "@/contracts/plutus.json";
import {
  applyCborEncoding,
  resolveScriptHash,
  serializePlutusScript,
} from "@meshsdk/core";

interface BlueprintValidator {
  title: string;
  compiledCode: string;
}

interface BlueprintFile {
  validators: BlueprintValidator[];
}

const networkId = Number(process.env.NEXT_PUBLIC_CARDANO_NETWORK_ID ?? "0") as
  | 0
  | 1;
const validators = (blueprint as BlueprintFile).validators;

function findCompiledCode(fragment: string, suffix: ".spend" | ".mint") {
  const validator = validators.find(
    (item) => item.title.includes(fragment) && item.title.endsWith(suffix),
  );

  if (!validator) {
    throw new Error(
      `Validator ${fragment}${suffix} was not found in plutus.json`,
    );
  }

  return validator.compiledCode;
}

export function getInvoiceValidatorBlueprint() {
  const compiledCode = findCompiledCode("invoice", ".spend");
  const cbor = applyCborEncoding(compiledCode);
  const hash = resolveScriptHash(cbor, "V3");
  const { address } = serializePlutusScript(
    { code: cbor, version: "V3" },
    undefined,
    networkId,
  );

  return {
    compiledCode,
    cbor,
    hash,
    address: String(address),
  };
}

export function getInvoiceMintBlueprint() {
  const compiledCode = findCompiledCode("mint_invoice_nft", ".mint");
  const cbor = applyCborEncoding(compiledCode);
  const hash = resolveScriptHash(cbor, "V3");

  return {
    compiledCode,
    cbor,
    hash,
  };
}
