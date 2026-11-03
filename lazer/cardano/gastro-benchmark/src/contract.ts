import { Lucid, Blockfrost, Script } from "lucid-cardano";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

// Leer el validator compilado
const plutus = JSON.parse(
  fs.readFileSync("../onchain/gastro_benchmark_working/plutus.json", "utf8")
);

const validatorScript: Script = {
  type: "PlutusV2",
  script: plutus.validators[0].compiledCode,
};

export async function getLucid() {
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      process.env.BLOCKFROST_KEY!
    ),
    "Preprod"
  );
  return lucid;
}

export const getContractAddress = (lucid: Awaited<ReturnType<typeof getLucid>>) =>
  lucid.utils.validatorToAddress(validatorScript);

export { validatorScript };
