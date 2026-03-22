import { Address, Data, UPLC, createClient } from "@evolution-sdk/evolution";
import { loadConfig } from "../config.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlock } from "../transactions/unlock.js";

function toEvolutionNetwork(network: "Preprod" | "Mainnet"): "preprod" | "mainnet" {
  return network === "Mainnet" ? "mainnet" : "preprod";
}

function requirePaymentCredentialHash(address: string): string {
  const credential = Address.getPaymentCredential(address);
  if (!credential) {
    throw new Error("Invalid bech32 address");
  }
  if (credential._tag !== "KeyHash") {
    throw new Error("Address must use key payment credential");
  }
  return credential.hash;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const blueprintPath = resolve(__dirname, "../../plutus.json");
const VALIDATOR_TITLE = "pay_with_pyth.pay_with_pyth.spend";

interface Blueprint {
  validators: Array<{
    title: string;
    compiledCode: string;
    hash: string;
  }>;
}

function getCompiledCode(): string {
  const raw = readFileSync(blueprintPath, "utf-8");
  const blueprint = JSON.parse(raw) as Blueprint;
  const validator = blueprint.validators.find((v) => v.title === VALIDATOR_TITLE);
  if (!validator) {
    throw new Error(`Validator '${VALIDATOR_TITLE}' not found in blueprint`);
  }
  return validator.compiledCode;
}

function encodeAddress(paymentKeyHash: string, stakeKeyHash?: string): Data.Data {
  const paymentCredential = Data.constr(0n, [Data.bytearray(paymentKeyHash)]);
  const stakeCredential = stakeKeyHash
    ? Data.constr(0n, [Data.constr(0n, [Data.constr(0n, [Data.bytearray(stakeKeyHash)])])])
    : Data.constr(1n, []);
  return Data.constr(0n, [paymentCredential, stakeCredential]);
}

function buildUnlockValidatorScript(params: {
  usdAmountCents: bigint;
  userPaymentKeyHash: string;
  sponsorPaymentKeyHash: string;
  pythPolicyId: string;
}): string {
  const compiledCode = getCompiledCode();
  const userAddress = encodeAddress(params.userPaymentKeyHash);
  const sponsorAddress = encodeAddress(params.sponsorPaymentKeyHash);
  const parameterizedScript = UPLC.applyParamsToScript(compiledCode, [
    params.usdAmountCents,
    userAddress,
    sponsorAddress,
    Data.bytearray(params.pythPolicyId),
  ]);

  return UPLC.applyDoubleCborEncoding(parameterizedScript);
}

async function main() {
  const usdAmountCents = BigInt(process.argv[2] ?? "1000");
  const userAddress = process.argv[3];

  if (!userAddress) {
    console.error(
      "Usage: tsx src/scripts/unlock.ts <usd_cents> <user_bech32_address>",
    );
    process.exit(1);
  }

  const config = loadConfig();
  const client = createClient({
    network: toEvolutionNetwork(config.network),
    provider: {
      type: "blockfrost",
      baseUrl: config.blockfrostUrl,
      projectId: config.blockfrostProjectId,
    },
  }).attachWallet({
    type: "seed",
    mnemonic: config.sponsorSeedPhrase,
  });

  const sponsorAddress = await client.address();
  const sponsorPaymentKeyHash = requirePaymentCredentialHash(sponsorAddress);
  const userPaymentKeyHash = requirePaymentCredentialHash(userAddress);

  const validatorScript = buildUnlockValidatorScript({
    usdAmountCents,
    userPaymentKeyHash,
    sponsorPaymentKeyHash,
    pythPolicyId: config.pythPolicyId,
  });

  console.log("Building unlock transaction...");
  console.log(`  USD amount: $${Number(usdAmountCents) / 100}`);
  console.log("  Fetching Pyth oracle price...");

  const txHash = await unlock(client, config, {
    validatorScript,
    usdAmountCents,
    userAddress,
    sponsorAddress,
  });

  console.log(`Unlock transaction submitted: ${txHash}`);
}

main().catch(console.error);
