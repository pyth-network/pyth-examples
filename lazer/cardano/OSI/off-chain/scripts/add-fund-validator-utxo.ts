import {
  Address,
  Data,
  InlineDatum,
  UTxO,
} from "@evolution-sdk/evolution";

import {
  formatTxHash,
  loadFirstValidatorUtxo,
  loadRuntimeFromEnv,
  loadValidatorUtxoByTxHash,
  makeLovelace,
  parseCliOutRef,
} from "../e2e.ts";
import {
  decodeOsiDatumData,
  makeFundRedeemerData,
  makeOsiDatumData,
} from "../osi.ts";

const runtime = await loadRuntimeFromEnv();

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
} as const;

// Parse CLI arguments
const additionalFundingLovelace = BigInt(process.argv[2] ?? "0");
const targetOutRef = parseCliOutRef(process.argv[3]);

if (!process.argv[2] || additionalFundingLovelace === 0n) {
  throw new Error(
    "Expected additional funding lovelace as first CLI argument (e.g., bun run add-fund-validator-utxo 2000000)"
  );
}

// Load the validator UTxO
let validatorUtxo: UTxO.UTxO;
if (targetOutRef) {
  validatorUtxo = await loadValidatorUtxoByTxHash(
    runtime.client,
    runtime.validator.address,
    targetOutRef.transactionIdHex,
    targetOutRef.index,
  );
} else {
  validatorUtxo = await loadFirstValidatorUtxo(
    runtime.client,
    runtime.validator.address,
  );
}

// Extract and decode the existing datum
let osiDatum;
try {
  osiDatum = decodeValidatorDatum(validatorUtxo);
} catch (error) {
  throw new Error(`Failed to decode validator datum: ${error}`);
}

const walletAddress = await runtime.client.address();
const currentValidatorLovelace = validatorUtxo.assets.lovelace;
const newValidatorLovelace = currentValidatorLovelace + additionalFundingLovelace;

try {
  // Build the transaction
  const builder = runtime.client
    .newTx()
    .attachScript({
      script: runtime.validator.script,
    })
    .collectFrom({
      inputs: [validatorUtxo],
      redeemer: makeFundRedeemerData(),
      label: "osi-fund",
    })
    // Return the combined funds to the validator with the same datum
    .payToAddress({
      address: runtime.validator.address,
      assets: makeLovelace(newValidatorLovelace),
      datum: new InlineDatum.InlineDatum({
        data: makeOsiDatumData(osiDatum),
      }),
    });

  const txHash = await builder
    .build()
    .then((built) => built.sign())
    .then((signed: any) => signed.submit());

  const submittedTxHash = formatTxHash(txHash);

  console.log("");
  console.log(
    `${ANSI.bold}${ANSI.green}✅💸 OSI FUND SUCCESS${ANSI.reset}`,
  );
  console.log(
    `${ANSI.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}`,
  );
  console.log(
    `${ANSI.cyan}🔗 Tx hash${ANSI.reset}            ${ANSI.bold}${submittedTxHash}${ANSI.reset}`,
  );
  console.log(
    `${ANSI.cyan}📦 Spent script UTxO${ANSI.reset}  ${UTxO.toOutRefString(validatorUtxo)}`,
  );
  console.log("");
  console.log(`${ANSI.bold}${ANSI.blue}🏷️  Addresses${ANSI.reset}`);
  console.log(`👛 Wallet      ${Address.toBech32(walletAddress)}`);
  console.log(`🏛️  Validator   ${Address.toBech32(runtime.validator.address)}`);
  console.log("");
  console.log(`${ANSI.bold}${ANSI.magenta}📊 Value Changes${ANSI.reset}`);
  console.log(`• Previous   ${formatLovelace(currentValidatorLovelace)}`);
  console.log(
    `• Added      ${ANSI.green}+${formatLovelace(additionalFundingLovelace)}${ANSI.reset}`,
  );
  console.log(
    `• New Total  ${ANSI.bold}${ANSI.yellow}${formatLovelace(newValidatorLovelace)}${ANSI.reset}`,
  );
  console.log("");
  console.log(`${ANSI.bold}${ANSI.yellow}🚀 Next${ANSI.reset}`);
  console.log(`bun run spend-validator-utxo ${submittedTxHash}`);
  console.log(
    `${ANSI.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}`,
  );
} catch (error) {
  if (error instanceof Error) {
    console.error(
      `${ANSI.bold}${ANSI.red}❌ Oops:${ANSI.reset} ${ANSI.red}${error.message}${ANSI.reset}`,
    );
  } else {
    console.error(
      `${ANSI.bold}${ANSI.red}❌ Oops:${ANSI.reset} ${ANSI.red}Unknown error occurred${ANSI.reset}`,
    );
  }
  throw error;
}

function decodeValidatorDatum(validatorUtxo: UTxO.UTxO) {
  const datumOption = validatorUtxo.datumOption;

  if (!datumOption || datumOption._tag !== "InlineDatum") {
    throw new Error("Validator UTxO is missing an inline OSI datum");
  }

  return decodeOsiDatumData(datumOption.data as Data.Constr);
}

function formatLovelace(value: bigint): string {
  const adaWhole = value / 1_000_000n;
  const adaFraction = value % 1_000_000n;

  return `${value.toLocaleString()} lovelace (${adaWhole.toLocaleString()}.${adaFraction
    .toString()
    .padStart(6, "0")} ADA)`;
}
