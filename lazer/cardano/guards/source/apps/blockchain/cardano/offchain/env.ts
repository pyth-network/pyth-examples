import path from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function readString(name: string, fallback = ""): string {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readOptionalNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const runtimeEnv = {
  appPublicName: readString("APP_PUBLIC_NAME", "guards.one"),
  appInternalName: readString("APP_INTERNAL_NAME", "anaconda"),
  port: readNumber("PORT", 4310),
  pythApiKey: readString("PYTH_API_KEY"),
  pythPreprodPolicyId: readString(
    "PYTH_PREPROD_POLICY_ID",
    "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6",
  ),
  pythApiBaseUrl: readString("PYTH_API_BASE_URL", "https://api.pyth.network"),
  pythMetadataServiceUrl: readString("PYTH_METADATA_SERVICE_URL"),
  pythPriceServiceUrl: readString("PYTH_PRICE_SERVICE_URL"),
  pythStreamChannel: readString("PYTH_STREAM_CHANNEL", "fixed_rate@200ms"),
  pythPrimaryFeedId: readString("PYTH_PRIMARY_FEED_ID", "pyth-ada-usd"),
  pythPrimarySymbolQuery: readString("PYTH_PRIMARY_SYMBOL_QUERY", "ADA/USD"),
  pythPrimaryAssetType: readString("PYTH_PRIMARY_ASSET_TYPE", "crypto"),
  pythPrimaryPriceFeedId: readOptionalNumber("PYTH_PRIMARY_PRICE_FEED_ID"),
  cardanoNetwork: readString("CARDANO_NETWORK", "preprod"),
  cardanoProvider: readString("CARDANO_PROVIDER", "blockfrost"),
  cardanoProviderUrl: readString(
    "CARDANO_PROVIDER_URL",
    "https://cardano-preprod.blockfrost.io/api/v0",
  ),
  cardanoBlockfrostProjectId: readString("CARDANO_BLOCKFROST_PROJECT_ID"),
  cardanoPythStateReference: readString(
    "CARDANO_PYTH_STATE_REFERENCE",
    "pyth-state-ref",
  ),
  cardanoSwapProvider: readString("CARDANO_SWAP_PROVIDER", "dexhunter"),
  cardanoProtocolFeeBps: readNumber("CARDANO_PROTOCOL_FEE_BPS", 30),
  cardanoMaxTotalFeeBps: readNumber("CARDANO_MAX_TOTAL_FEE_BPS", 100),
  cardanoProtocolFeeMode: readString(
    "CARDANO_PROTOCOL_FEE_MODE",
    "explicit_output",
  ),
  cardanoExecutionRouteId: readString(
    "CARDANO_EXECUTION_ROUTE_ID",
    "cardano-minswap-ada-usdm",
  ),
  dexHunterBaseUrl: readString(
    "DEXHUNTER_BASE_URL",
    "https://api-us.dexhunterv3.app",
  ),
  dexHunterPartnerId: readString("DEXHUNTER_PARTNER_ID"),
  dexHunterPartnerFeePercent: readNumber("DEXHUNTER_PARTNER_FEE_PERCENT", 0.3),
  minswapAggregatorUrl: readString(
    "MINSWAP_AGGREGATOR_URL",
    "https://agg-api.minswap.org/aggregator",
  ),
  minswapPartnerCode: readString("MINSWAP_PARTNER_CODE"),
  cardanoExecutionHotWalletAddress: readString(
    "CARDANO_EXECUTION_HOT_WALLET_ADDRESS",
  ),
  cardanoExecutionHotWalletSkeyPath: readString(
    "CARDANO_EXECUTION_HOT_WALLET_SKEY_PATH",
    "./secrets/execution-hot.skey",
  ),
  cardanoGovernanceWalletAddress: readString("CARDANO_GOVERNANCE_WALLET_ADDRESS"),
  cardanoGovernanceSkeyPath: readString(
    "CARDANO_GOVERNANCE_SKEY_PATH",
    "./secrets/governance.skey",
  ),
  auditDbPath: readString("AUDIT_DB_PATH", "./data/guards-one.sqlite"),
} as const;
