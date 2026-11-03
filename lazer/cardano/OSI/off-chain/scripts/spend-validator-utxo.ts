import {
  Address,
  Data,
  Effect,
  ScriptHash,
  Transaction,
  UTxO,
} from "@evolution-sdk/evolution";
import {
  getPythScriptHash,
  getPythState,
} from "@pythnetwork/pyth-lazer-cardano-js";

import {
  fetchLatestSignedUpdate,
  formatTxHash,
  loadFirstValidatorUtxo,
  loadValidatorUtxoByTxHash,
  logDetailedError,
  loadRuntimeFromEnv,
  makeWithdrawRedeemer,
  parseCliOutRef,
  readLazerToken,
  makeLovelace,
} from "../e2e.ts";
import {
  decodeOsiDatumData,
  makePayoutRedeemerData,
  paymentCredentialToAddress,
  type OsiDatum,
} from "../osi.ts";
import type { ParsedFeedPayload } from "@pythnetwork/pyth-lazer-sdk";

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

const runtime = await loadRuntimeFromEnv();
const lazerToken = readLazerToken();
const targetOutRef = parseCliOutRef(process.argv[2]);
const validatorUtxo = targetOutRef
  ? await loadValidatorUtxoByTxHash(
      runtime.client,
      runtime.validator.address,
      targetOutRef.transactionIdHex,
      targetOutRef.index,
    )
  : await loadFirstValidatorUtxo(runtime.client, runtime.validator.address);

const pythState = await getPythState(
  runtime.pythPolicyId,
  runtime.providerClient,
);
const pythWithdrawScriptHash = getPythScriptHash(pythState);
const pythUpdate = await fetchLatestSignedUpdate(lazerToken, runtime.queryFeedIds);
const osiDatum = decodeValidatorDatum(validatorUtxo);
const paymentOutputs = buildPaymentOutputs(runtime.network, osiDatum, pythUpdate.parsed);

const now = BigInt(Date.now());
const loggingEvaluator = {
  evaluate: (
    tx: Transaction.Transaction,
    additionalUtxos: ReadonlyArray<UTxO.UTxO> | undefined,
  ) =>
    Effect.gen(function* () {
      console.log(`${ANSI.bold}${ANSI.blue}🧪 Evaluation${ANSI.reset}`);
      console.log(`${ANSI.cyan}CBOR${ANSI.reset}`);
      console.log(Transaction.toCBORHex(tx));

      if (additionalUtxos && additionalUtxos.length > 0) {
        console.log(`${ANSI.cyan}Additional UTxOs${ANSI.reset}`);
        console.dir(additionalUtxos.map(UTxO.toOutRefString), {
          depth: null,
          colors: true,
        });
      }

      return yield* runtime.providerClient.Effect.evaluateTx(tx);
    }),
} as const;

console.log("");
console.log(`${ANSI.bold}${ANSI.blue}⚙️  OSI PAYOUT CONTEXT${ANSI.reset}`);
console.log(
  `${ANSI.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}`,
);
console.log(`🏛️  Validator   ${Address.toBech32(runtime.validator.address)}`);
console.log(`📦 Input UTxO   ${UTxO.toOutRefString(validatorUtxo)}`);
console.log(`🔐 Pyth State   ${UTxO.toOutRefString(pythState)}`);
console.log(`🧾 Withdraw SH  ${pythWithdrawScriptHash}`);
console.log(`📈 Feed IDs     ${runtime.feedId} (primary) | ${runtime.queryFeedIds.join(", ")}`);
console.log(`🛰️ Update Hex   ${pythUpdate.signedUpdateHex}`);
console.log("");

try {
  let builder = runtime.client
    .newTx()
    .setValidity({
      from: now - 60_000n,
      to: now + 60_000n,
    })
    .readFrom({
      referenceInputs: [pythState],
    })
    .withdraw({
      amount: 0n,
      redeemer: makeWithdrawRedeemer(pythUpdate.signedUpdate),
      stakeCredential: ScriptHash.fromHex(pythWithdrawScriptHash),
      label: "pyth-withdraw",
    })
    .attachScript({
      script: runtime.validator.script,
    })
    .collectFrom({
      inputs: [validatorUtxo],
      redeemer: makePayoutRedeemerData(),
      label: "osi-payout",
    });

  let totalPaymentLvc = 0n;
  for (const payment of paymentOutputs) {
    builder = builder.payToAddress({
      address: payment.address,
      assets: makeLovelace(payment.lovelace),
    });

    totalPaymentLvc += payment.lovelace;
  }

  if (totalPaymentLvc < validatorUtxo.assets.lovelace) {
    builder = builder.payToAddress({
      address: validatorUtxo.address,
      assets: makeLovelace(validatorUtxo.assets.lovelace - totalPaymentLvc),
      datum: validatorUtxo.datumOption
    });
  }

  const remainingLovelace =
    validatorUtxo.assets.lovelace > totalPaymentLvc
      ? validatorUtxo.assets.lovelace - totalPaymentLvc
      : 0n;

  const txHash = await builder
    .build({})
    .then((built) => built.sign())
    .then((signed) => signed.submit());

  const spendTxHash = formatTxHash(txHash);

  console.log("");
  console.log(`${ANSI.bold}${ANSI.green}✅💸 OSI PAYOUT SUCCESS${ANSI.reset}`);
  console.log(
    `${ANSI.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}`,
  );
  console.log(`${ANSI.cyan}🔗 Tx hash${ANSI.reset}      ${ANSI.bold}${spendTxHash}${ANSI.reset}`);
  console.log(`${ANSI.cyan}📤 Paid out${ANSI.reset}     ${formatLovelace(totalPaymentLvc)}`);
  console.log(`${ANSI.cyan}🏦 Remaining${ANSI.reset}    ${formatLovelace(remainingLovelace)}`);
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
  logDetailedError(error);
  throw error;
}

function decodeValidatorDatum(validatorUtxo: UTxO.UTxO): OsiDatum {
  const datumOption = validatorUtxo.datumOption;

  if (!datumOption || datumOption._tag !== "InlineDatum") {
    throw new Error("Validator UTxO is missing an inline OSI datum");
  }

  return decodeOsiDatumData(datumOption.data as Data.Constr);
}

function buildPaymentOutputs(
  network: "mainnet" | "preprod" | "preview",
  datum: OsiDatum,
  parsedUpdate: typeof pythUpdate.parsed,
): { address: Address.Address; lovelace: bigint }[] {
  if (!parsedUpdate) {
    throw new Error("Pyth update is missing parsed feed data");
  }

  const quoteFeed = findFeed(parsedUpdate.priceFeeds, 16);
  const baseFeed = findFeed(parsedUpdate.priceFeeds, 8);
  const networkId = network === "mainnet" ? 1 : 0;

  return Array.from(datum.payees, ([paymentCredential, quoteAmount]) => ({
    address: paymentCredentialToAddress(paymentCredential, networkId),
    lovelace: computeLovelacePayout(quoteAmount, quoteFeed, baseFeed),
  }));
}

function findFeed(
  feeds: readonly ParsedFeedPayload[],
  priceFeedId: number,
): ParsedFeedPayload {
  const feed = feeds.find((candidate) => candidate.priceFeedId === priceFeedId);

  if (!feed) {
    throw new Error(`Missing parsed Pyth feed ${priceFeedId}`);
  }

  if (feed.price === undefined || feed.exponent === undefined) {
    throw new Error(`Parsed Pyth feed ${priceFeedId} is missing price data`);
  }

  return feed;
}

function computeLovelacePayout(
  quoteAmount: bigint,
  quoteFeed: ParsedFeedPayload,
  baseFeed: ParsedFeedPayload,
): bigint {
  const quotePrice = BigInt(quoteFeed.price!);
  const basePrice = BigInt(baseFeed.price!);
  const quoteExponent = quoteFeed.exponent!;
  const baseExponent = baseFeed.exponent!;

  if (basePrice <= 0n || quotePrice <= 0n) {
    throw new Error("Pyth prices must be positive for payout calculation");
  }

  if (quoteExponent >= baseExponent) {
    const scale = 10n ** BigInt(quoteExponent - baseExponent);
    return (quoteAmount * quotePrice * scale) / basePrice;
  }

  const scale = 10n ** BigInt(baseExponent - quoteExponent);
  return (quoteAmount * quotePrice) / (basePrice * scale);
}

function formatLovelace(value: bigint): string {
  const adaWhole = value / 1_000_000n;
  const adaFraction = value % 1_000_000n;

  return `${value.toLocaleString()} lovelace (${adaWhole.toLocaleString()}.${adaFraction
    .toString()
    .padStart(6, "0")} ADA)`;
}
