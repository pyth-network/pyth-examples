/**
 * One-command demo of the Pyth Lazer Stellar example consumer.
 *
 * Fetches a freshly signed Pyth Lazer price update over REST, submits it to a
 * deployed instance of the example consumer contract, and reads the stored
 * price back in human units.
 *
 * Deliberately self-contained: it depends only on `@stellar/stellar-sdk` and
 * talks to Lazer with plain `fetch`, so it runs outside the Pyth monorepos.
 */

import { parseArgs } from "node:util";

import {
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Api, Server } from "@stellar/stellar-sdk/rpc";

const NETWORKS = {
  mainnet: {
    explorer: "public",
    friendbot: undefined,
    horizonUrl: "https://horizon.stellar.org",
    // Inclusion bid, not the resource fee: `prepareTransaction` adds the Soroban
    // resource fee on top but leaves this untouched. Mainnet ledgers run close to
    // full, so a BASE_FEE bid gets evicted and the transaction expires without
    // ever reaching a ledger.
    inclusionFee: "1000000",
    networkPassphrase: Networks.PUBLIC,
    rpcUrl: "https://mainnet.sorobanrpc.com",
  },
  testnet: {
    explorer: "testnet",
    friendbot: "https://friendbot.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    inclusionFee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    rpcUrl: "https://soroban-testnet.stellar.org",
  },
} as const;

type NetworkName = keyof typeof NETWORKS;

const DEFAULT_LAZER_ENDPOINT =
  "https://pyth-lazer-0.dourolabs.app/v1/latest_price";
const DEFAULT_FEED_ID = "1"; // BTC/USD
const DEFAULT_CHANNEL = "fixed_rate@200ms";

/**
 * The example consumer reads `price`, `exponent` and `feed_update_timestamp`
 * off the verified payload. A property that is not requested decodes to `None`
 * and `update_price` fails with `ExponentMissing` / `TimestampMissing`, so all
 * three are mandatory here.
 */
const REQUIRED_PROPERTIES = [
  "price",
  "exponent",
  "feedUpdateTimestamp",
] as const;

/** Contract error codes from the example consumer's `Error` enum (src/error.rs). */
const CONTRACT_ERRORS: Record<number, string> = {
  1: "PriceStale — the update is older than the contract's freshness_threshold_us. Fetch a fresh update and submit it immediately.",
  2: "FeedMissing — the payload does not carry the feed id this contract was deployed with. Pass --feed-id matching the contract's configured feed.",
  3: "TimestampMissing — the payload has no feedUpdateTimestamp. Request the 'feedUpdateTimestamp' property from Lazer.",
  4: "PriceMissing — the payload has no price. Request the 'price' property from Lazer.",
  5: "ExponentMissing — the payload has no exponent. Request the 'exponent' property from Lazer.",
  6: "PriceNotInitialized — no update has ever been stored. Run update_price first.",
  7: "Overflow — ledger timestamp overflowed when converted to microseconds.",
  8: "ParseError — the verifier rejected or could not parse the update.",
  9: "PriceOutdated — the stored price is at least as new as this update. update_price is strictly monotonic; fetch a NEW update rather than replaying a cached payload.",
};

const USAGE = `
Usage: npm run demo -- --contract-id <CONSUMER_CONTRACT_ID> [options]

Options:
  --contract-id <C...>  Deployed example consumer contract id. Required.
  --network <name>      testnet | mainnet. Default: testnet.
  --secret <S...>       Stellar secret key. Defaults to $STELLAR_WALLET_SECRET.
                        On testnet a throwaway key is generated and friendbot-funded
                        when neither is given. Required on mainnet.
  --feed-id <n>         Pyth Lazer price feed id. Default: ${DEFAULT_FEED_ID} (BTC/USD).
                        Must match the feed the contract was deployed with.
  --channel <name>      Lazer channel. Default: ${DEFAULT_CHANNEL}.
  --lazer-endpoint <u>  Lazer latest_price REST endpoint.
                        Default: ${DEFAULT_LAZER_ENDPOINT}
  --help                Show this message.

Environment:
  PYTH_API_KEY            Pyth Lazer bearer token. Required.
                          (PYTH_LAZER_TOKEN is accepted as an alias.)
  STELLAR_WALLET_SECRET   Stellar secret key used to sign, unless --secret is given.
`.trim();

const { values } = parseArgs({
  options: {
    channel: { type: "string", default: DEFAULT_CHANNEL },
    "contract-id": { type: "string" },
    "feed-id": { type: "string", default: DEFAULT_FEED_ID },
    help: { type: "boolean", default: false },
    "lazer-endpoint": { type: "string", default: DEFAULT_LAZER_ENDPOINT },
    network: { type: "string", default: "testnet" },
    secret: { type: "string" },
  },
  strict: true,
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

/** Abort with a message the operator can act on, without a stack trace. */
function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function isNetworkName(name: string): name is NetworkName {
  return name in NETWORKS;
}

if (!isNetworkName(values.network)) {
  fail(
    `Unknown --network '${values.network}'. Expected one of: ${Object.keys(NETWORKS).join(", ")}.`,
  );
}
const networkName: NetworkName = values.network;
const network = NETWORKS[networkName];

const contractId = values["contract-id"];
if (!contractId) {
  fail(
    `--contract-id is required: the id of a deployed example consumer contract.\n\n${USAGE}`,
  );
}

const feedId = Number(values["feed-id"]);
if (!Number.isInteger(feedId) || feedId < 0) {
  fail(`--feed-id must be a non-negative integer, got '${values["feed-id"]}'.`);
}

const lazerToken =
  process.env["PYTH_API_KEY"] ?? process.env["PYTH_LAZER_TOKEN"];
if (!lazerToken) {
  fail(
    "Set PYTH_API_KEY to your Pyth Lazer access token (it doubles as the Lazer bearer token).",
  );
}

/**
 * Render a Lazer fixed-point price (`price * 10^exponent`) as a decimal string.
 * Done on the integer, not via floating point, so no precision is lost.
 */
function formatScaled(price: bigint, exponent: number): string {
  if (exponent >= 0) {
    return (price * 10n ** BigInt(exponent)).toString();
  }
  const decimals = -exponent;
  const negative = price < 0n;
  const digits = (negative ? -price : price)
    .toString()
    .padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function formatMicros(timestampUs: bigint): string {
  return new Date(Number(timestampUs / 1000n)).toISOString();
}

/**
 * Soroban surfaces a contract error as `Error(Contract, #N)` inside a wall of
 * simulation diagnostics. Pull out N and lead with what it means, so a failed
 * demo opens with the actionable line instead of XDR.
 */
function explainContractError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const match = /Error\(Contract, #(\d+)\)/.exec(text);
  if (!match?.[1]) {
    return text;
  }
  const code = Number(match[1]);
  const meaning = CONTRACT_ERRORS[code] ?? "unknown error code.";
  return `contract error #${code}: ${meaning}\n\n   Full diagnostics:\n${text}`;
}

type LazerResponse = {
  parsed?: {
    timestampUs: string;
    priceFeeds: {
      priceFeedId: number;
      price: string;
      exponent: number;
      feedUpdateTimestamp: number | string;
    }[];
  };
  leEcdsa?: { encoding: string; data: string };
};

/** Fetch a freshly signed update for `feedId`, carrying all three required properties. */
async function fetchLazerUpdate(): Promise<{
  hex: string;
  parsed: LazerResponse["parsed"];
}> {
  const response = await fetch(values["lazer-endpoint"], {
    body: JSON.stringify({
      channel: values.channel,
      formats: ["leEcdsa"],
      jsonBinaryEncoding: "hex",
      priceFeedIds: [feedId],
      properties: REQUIRED_PROPERTIES,
    }),
    headers: {
      Authorization: `Bearer ${lazerToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    fail(
      `Lazer request failed: ${response.status} ${response.statusText}\n   ${body}\n\n   Check PYTH_API_KEY, and that feed id ${feedId} and channel '${values.channel}' are available to your token.`,
    );
  }

  const body = (await response.json()) as LazerResponse;
  const hex = body.leEcdsa?.data;
  if (!hex) {
    fail(
      `Lazer returned no 'leEcdsa' payload. Soroban needs the leEcdsa format.\n   Response: ${JSON.stringify(body)}`,
    );
  }
  return { hex, parsed: body.parsed };
}

// --- Step 1: resolve the signing account -------------------------------------

const server = new Server(network.rpcUrl);

console.log(`=== Pyth Lazer Stellar demo (${networkName}) ===`);
console.log(`  Example consumer: ${contractId}`);
console.log(
  `  Explorer:         https://stellar.expert/explorer/${network.explorer}/contract/${contractId}`,
);

/** Native XLM balance as a decimal string, or `undefined` if the account is unfunded. */
async function nativeBalance(publicKey: string): Promise<string | undefined> {
  const response = await fetch(`${network.horizonUrl}/accounts/${publicKey}`);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    fail(
      `Horizon could not read account ${publicKey}: ${response.status} ${response.statusText}`,
    );
  }
  const account = (await response.json()) as {
    balances: { asset_type: string; balance: string }[];
  };
  return (
    account.balances.find((b) => b.asset_type === "native")?.balance ?? "0"
  );
}

async function friendbotFund(publicKey: string): Promise<void> {
  const funded = await fetch(
    `${network.friendbot}?addr=${encodeURIComponent(publicKey)}`,
  );
  if (!funded.ok) {
    fail(
      `Friendbot could not fund ${publicKey}: ${funded.status} ${funded.statusText}\n   ${await funded.text()}`,
    );
  }
}

const secret = values.secret ?? process.env["STELLAR_WALLET_SECRET"];
let keypair: Keypair;
if (secret) {
  try {
    keypair = Keypair.fromSecret(secret);
  } catch {
    fail(
      "The Stellar secret key is not a valid S... key. Check --secret / $STELLAR_WALLET_SECRET.",
    );
  }
  console.log(
    `\n=== Signing account (from --secret / $STELLAR_WALLET_SECRET) ===`,
  );
} else if (networkName === "mainnet") {
  fail(
    "Mainnet has no friendbot, so a funded account is required. Set STELLAR_WALLET_SECRET or pass --secret.",
  );
} else {
  keypair = Keypair.random();
  console.log(`\n=== Signing account (generated) ===`);
}

console.log(`  Public key: ${keypair.publicKey()}`);

// Report the balance before spending anything, so the operator can see exactly
// which account pays for the demo.
let balance = await nativeBalance(keypair.publicKey());
if (balance === undefined) {
  if (networkName === "mainnet") {
    fail(
      `Account ${keypair.publicKey()} does not exist on mainnet. Fund it with XLM before running the demo.`,
    );
  }
  // A key that is only funded on mainnet is still unfunded here, so friendbot
  // covers both the generated key and a provided-but-unfunded one.
  console.log(`  Unfunded on testnet — requesting friendbot airdrop…`);
  await friendbotFund(keypair.publicKey());
  balance = await nativeBalance(keypair.publicKey());
}
console.log(`  XLM balance: ${balance ?? "unknown"}`);

// --- Step 2: fetch a freshly signed Lazer update -----------------------------

console.log(
  `\n=== Fetching signed Lazer update (feed ${feedId}, ${values.channel}) ===`,
);
const { hex, parsed } = await fetchLazerUpdate();
const update = Buffer.from(hex, "hex");
console.log(`  Update size: ${update.length} bytes`);
console.log(`  Update hex:  ${hex}`);

const parsedFeed = parsed?.priceFeeds.find((f) => f.priceFeedId === feedId);
if (parsedFeed) {
  const offChainTs = BigInt(parsedFeed.feedUpdateTimestamp);
  console.log(
    `  Off-chain price: ${formatScaled(BigInt(parsedFeed.price), parsedFeed.exponent)} (raw ${parsedFeed.price}, exponent ${parsedFeed.exponent})`,
  );
  console.log(
    `  Feed timestamp:  ${offChainTs} us (${formatMicros(offChainTs)})`,
  );
}

// --- Step 3: submit it to the example consumer -------------------------------

console.log(`\n=== Submitting update_price to the example consumer ===`);
const contract = new Contract(contractId);
const account = await server.getAccount(keypair.publicKey());
const tx = new TransactionBuilder(account, {
  fee: network.inclusionFee,
  networkPassphrase: network.networkPassphrase,
})
  .addOperation(
    contract.call("update_price", nativeToScVal(update, { type: "bytes" })),
  )
  .setTimeout(60)
  .build();

let prepared;
try {
  prepared = await server.prepareTransaction(tx);
} catch (error) {
  fail(`update_price failed in simulation — ${explainContractError(error)}`);
}
prepared.sign(keypair);

const sendResult = await server.sendTransaction(prepared);
console.log(`  Transaction hash: ${sendResult.hash}`);
console.log(
  `  Explorer:         https://stellar.expert/explorer/${network.explorer}/tx/${sendResult.hash}`,
);
if (sendResult.status === "ERROR") {
  fail(
    `Transaction submission failed: ${JSON.stringify(sendResult.errorResult)}\n   ${explainContractError(JSON.stringify(sendResult.errorResult))}`,
  );
}

const txResult = await server.pollTransaction(sendResult.hash);
if (txResult.status === Api.GetTransactionStatus.NOT_FOUND) {
  fail(
    `Transaction ${sendResult.hash} was dropped before reaching a ledger, so nothing executed and no fee was charged.\n   The ledger was most likely full and the inclusion fee of ${network.inclusionFee} stroops was outbid. Retry; raise the inclusion fee if it keeps happening.`,
  );
}
if (txResult.status !== Api.GetTransactionStatus.SUCCESS) {
  fail(
    `update_price did not succeed: ${txResult.status}\n   ${explainContractError(JSON.stringify(txResult))}`,
  );
}
console.log(`  Status:           SUCCESS (ledger ${txResult.ledger})`);

// --- Step 4: read the stored price back --------------------------------------

console.log(`\n=== Reading get_price back from the contract ===`);
const readAccount = await server.getAccount(keypair.publicKey());
const readTx = new TransactionBuilder(readAccount, {
  fee: network.inclusionFee,
  networkPassphrase: network.networkPassphrase,
})
  .addOperation(contract.call("get_price"))
  .setTimeout(60)
  .build();

// `get_price` only reads, so simulating it is the whole call: no fee, no ledger.
const simulation = await server.simulateTransaction(readTx);
if (Api.isSimulationError(simulation)) {
  fail(`get_price failed — ${explainContractError(simulation.error)}`);
}
if (!simulation.result?.retval) {
  fail("get_price returned no value.");
}

const stored = scValToNative(simulation.result.retval) as {
  price: bigint;
  exponent: number;
  timestamp_us: bigint;
};

console.log(`  Stored price:   ${formatScaled(stored.price, stored.exponent)}`);
console.log(`  Raw price:      ${stored.price} (exponent ${stored.exponent})`);
console.log(
  `  Feed timestamp: ${stored.timestamp_us} us (${formatMicros(stored.timestamp_us)})`,
);

console.log(`\n✅ Demo complete.`);
console.log(
  `   Contract: https://stellar.expert/explorer/${network.explorer}/contract/${contractId}`,
);
console.log(
  `   Update tx: https://stellar.expert/explorer/${network.explorer}/tx/${sendResult.hash}`,
);
