import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import {
  Address,
  Assets,
  Cardano,
  Data,
  ScriptHash,
  TransactionHash,
  UPLC,
  UTxO,
  createClient,
  type ProviderConfig,
  type ProviderOnlyClient,
  type SigningClient,
} from "@evolution-sdk/evolution";
import {
  PythLazerClient,
  type JsonUpdate,
  type PriceFeedProperty,
} from "@pythnetwork/pyth-lazer-sdk";

const OFF_CHAIN_DIR = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(OFF_CHAIN_DIR, ".env") });

const PLUTUS_JSON_PATH = join(OFF_CHAIN_DIR, "../on-chain/plutus.json");
const VALIDATOR_TITLE = "osi.oracle_settled_invoice.spend";
const ADA_USD_FEED_ID = 16;
const USDT_USD_FEED_ID = 8;

const DEFAULT_LAZER_PROPERTIES = [
  "price",
  "exponent",
  "feedUpdateTimestamp",
] as const satisfies readonly PriceFeedProperty[];

const DEFAULT_LAZER_WS_URLS = [
  "wss://pyth-lazer-0.dourolabs.app/v1/stream",
  "wss://pyth-lazer-1.dourolabs.app/v1/stream",
  "wss://pyth-lazer-2.dourolabs.app/v1/stream",
] as const;

type NetworkName = "mainnet" | "preprod" | "preview";

type BlueprintValidator = {
  title: string;
  compiledCode: string;
  hash?: string;
  parameters?: unknown[];
};

type Blueprint = {
  validators: BlueprintValidator[];
};

export type OsiRuntime = {
  client: SigningClient;
  providerClient: ProviderOnlyClient;
  network: NetworkName;
  feedId: number;
  queryFeedIds: number[];
  pythPolicyId: string;
  fundingLovelace: bigint;
  validator: {
    script: Cardano.PlutusV3.PlutusV3;
    scriptHash: ScriptHash.ScriptHash;
    address: Address.Address;
  };
};

export type PythSignedUpdate = {
  signedUpdate: Buffer;
  signedUpdateHex: string;
  parsed: JsonUpdate["parsed"];
};

export async function loadRuntimeFromEnv(): Promise<OsiRuntime> {
  const network = readNetwork();
  const pythPolicyId = readRequiredEnv("PYTH_POLICY_ID");
  const feedId = ADA_USD_FEED_ID;
  const queryFeedIds = [ADA_USD_FEED_ID, USDT_USD_FEED_ID];
  const fundingLovelace = 500_000_000n;
  const providerConfig = readProviderConfig();
  const client = createSigningClientFromEnv(network, providerConfig);
  const providerClient = createProviderOnlyClient(network, providerConfig);
  const validator = await loadParameterizedValidator({
    network,
    pythPolicyId,
    baseAssetId: BigInt(USDT_USD_FEED_ID),
  });

  return {
    client,
    providerClient,
    network,
    feedId,
    queryFeedIds,
    pythPolicyId,
    fundingLovelace,
    validator,
  };
}

export async function loadFirstValidatorUtxo(
  client: SigningClient,
  address: Address.Address,
): Promise<UTxO.UTxO> {
  const utxos = await client.getUtxos(address);
  const [utxo] = utxos;

  if (!utxo) {
    throw new Error(
      `No UTxOs found at validator address ${Address.toBech32(address)}`,
    );
  }

  return utxo;
}

export async function loadValidatorUtxoByTxHash(
  client: SigningClient,
  address: Address.Address,
  transactionIdHex: string,
  index?: bigint,
): Promise<UTxO.UTxO> {
  const utxos = await client.getUtxos(address);
  const matches = utxos.filter((utxo) => {
    if (TransactionHash.toHex(utxo.transactionId) !== transactionIdHex) {
      return false;
    }

    return index === undefined || utxo.index === index;
  });

  const [utxo] = matches;

  if (!utxo) {
    const target =
      index === undefined
        ? transactionIdHex
        : `${transactionIdHex}#${index.toString()}`;

    throw new Error(
      `No validator UTxO found at ${Address.toBech32(address)} for ${target}`,
    );
  }

  return utxo;
}

export function parseCliOutRef(argument: string | undefined): {
  transactionIdHex: string;
  index?: bigint;
} | null {
  if (!argument) {
    return null;
  }

  const [transactionIdHex, indexRaw] = argument.split("#");

  if (!transactionIdHex || !/^[0-9a-fA-F]{64}$/.test(transactionIdHex)) {
    throw new Error(
      "Expected first CLI argument to be a 64-hex transaction hash or <txHash>#<index>",
    );
  }

  if (indexRaw === undefined) {
    return {
      transactionIdHex: transactionIdHex.toLowerCase(),
    };
  }

  if (!/^\d+$/.test(indexRaw)) {
    throw new Error("UTxO index must be a non-negative integer");
  }

  return {
    transactionIdHex: transactionIdHex.toLowerCase(),
    index: BigInt(indexRaw),
  };
}

export async function fetchLatestSignedUpdate(
  token: string,
  feedIds: readonly number[],
): Promise<PythSignedUpdate> {
  const client = await PythLazerClient.create({
    token,
    webSocketPoolConfig: {
      numConnections: DEFAULT_LAZER_WS_URLS.length,
      urls: [...DEFAULT_LAZER_WS_URLS],
    },
  });

  try {
    const latest = await client.getLatestPrice({
      channel: "fixed_rate@200ms",
      priceFeedIds: [...feedIds],
      properties: [...DEFAULT_LAZER_PROPERTIES],
      formats: ["solana"],
      jsonBinaryEncoding: "hex",
      parsed: true,
    });

    const signedUpdateHex = latest.solana?.data;

    if (!signedUpdateHex) {
      throw new Error("Pyth response did not include a signed solana update");
    }

    return {
      signedUpdate: Buffer.from(signedUpdateHex, "hex"),
      signedUpdateHex,
      parsed: latest.parsed,
    };
  } finally {
    client.shutdown();
  }
}

export function makeWithdrawRedeemer(update: Buffer): Data.Data {
  return Data.list([update]);
}

export function formatTxHash(txHash: TransactionHash.TransactionHash): string {
  return TransactionHash.toHex(txHash);
}

export function logDetailedError(error: unknown): void {
  console.error("Detailed error:");
  console.dir(normalizeError(error), { depth: null, colors: true });

  if (error instanceof Error && error.stack) {
    console.error("\nStack:");
    console.error(error.stack);
  }
}

export function readLazerToken(): string {
  return readRequiredEnv("LAZER_TOKEN");
}

export function readWalletMnemonic(): string {
  return readRequiredEnv("WALLET_MNEMONIC");
}

export function makeLovelace(amount: bigint): Assets.Assets {
  return Assets.fromLovelace(amount);
}

async function loadParameterizedValidator({
  network,
  pythPolicyId,
  baseAssetId,
}: {
  network: NetworkName;
  pythPolicyId: string;
  baseAssetId: bigint;
}) {
  const blueprintRaw = await readFile(PLUTUS_JSON_PATH, "utf8");
  const blueprint = JSON.parse(blueprintRaw) as Blueprint;
  const validator = blueprint.validators.find(
    (candidate) => candidate.title === VALIDATOR_TITLE,
  );

  if (!validator) {
    throw new Error(`Validator ${VALIDATOR_TITLE} not found in plutus.json`);
  }

  const scriptBytesHex =
    Array.isArray(validator.parameters) && validator.parameters.length > 0
      ? UPLC.applySingleCborEncoding(
          UPLC.applyParamsToScript(validator.compiledCode, [
            Buffer.from(pythPolicyId, "hex"),
            baseAssetId,
          ]),
        )
      : validator.compiledCode;

  const script = new Cardano.PlutusV3.PlutusV3({
    bytes: Buffer.from(scriptBytesHex, "hex"),
  });
  const scriptHash = ScriptHash.fromScript(script);
  const scriptHashHex = ScriptHash.toHex(scriptHash);

  if (
    (!Array.isArray(validator.parameters) ||
      validator.parameters.length === 0) &&
    validator.hash &&
    validator.hash !== scriptHashHex
  ) {
    throw new Error(
      `Loaded validator hash ${scriptHashHex} does not match blueprint hash ${validator.hash}`,
    );
  }

  const address = new Address.Address({
    networkId: networkToAddressNetworkId(network),
    paymentCredential: scriptHash,
  });

  return {
    script,
    scriptHash,
    address,
  };
}

function createSigningClientFromEnv(
  network: NetworkName,
  provider: ProviderConfig,
): SigningClient {
  return createClient({
    network,
    provider,
    wallet: {
      type: "seed",
      mnemonic: readWalletMnemonic(),
    },
  });
}

function createProviderOnlyClient(
  network: NetworkName,
  provider: ProviderConfig,
): ProviderOnlyClient {
  return createClient({
    network,
    provider,
  });
}

function readProviderConfig(): ProviderConfig {
  const providerType = (process.env.PROVIDER_TYPE?.trim() || "blockfrost") as
    | "blockfrost"
    | "kupmios"
    | "maestro"
    | "koios";

  switch (providerType) {
    case "blockfrost":
      return {
        type: "blockfrost",
        baseUrl: readRequiredEnv("BLOCKFROST_BASE_URL"),
        projectId: readRequiredEnv("BLOCKFROST_PROJECT_ID"),
      };
    case "kupmios":
      return {
        type: "kupmios",
        kupoUrl: readRequiredEnv("KUPO_URL"),
        ogmiosUrl: readRequiredEnv("OGMIOS_URL"),
      };
    case "maestro":
      return {
        type: "maestro",
        baseUrl: readRequiredEnv("MAESTRO_BASE_URL"),
        apiKey: readRequiredEnv("MAESTRO_API_KEY"),
      };
    case "koios":
      return {
        type: "koios",
        baseUrl: readRequiredEnv("KOIOS_BASE_URL"),
        token: optionalEnv("KOIOS_TOKEN"),
      };
    default:
      throw new Error(
        `Unsupported PROVIDER_TYPE: ${providerType satisfies never}`,
      );
  }
}

function readNetwork(): NetworkName {
  const network = (process.env.NETWORK?.trim() || "preprod") as NetworkName;

  if (network !== "mainnet" && network !== "preprod" && network !== "preview") {
    throw new Error(`Unsupported NETWORK: ${network}`);
  }

  return network;
}

function networkToAddressNetworkId(network: NetworkName): number {
  return network === "mainnet" ? 1 : 0;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not set in environment`);
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return value;
}

function normalizeError(error: unknown): unknown {
  if (error instanceof Error) {
    const errorRecord = error as unknown as Record<string, unknown>;

    return {
      name: error.name,
      message: error.message,
      ...errorRecord,
      cause: normalizeNestedValue(
        (error as unknown as { cause?: unknown }).cause,
      ),
    };
  }

  return normalizeNestedValue(error);
}

function normalizeNestedValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeNestedValue);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("hex");
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalizeNestedValue(nested),
      ]),
    );
  }

  return value;
}
