import type { ExecutionIntent, ExecutionResult, RouteSpec } from "@anaconda/core";
import { runtimeEnv } from "./env.js";
import {
  applyRevenueFees,
  buildProtocolFeePolicy,
  getConfiguredVenueFeePercent,
  type RevenueBreakdown,
} from "./protocol-fee.js";
import {
  getCardanoSwapVenueConfig,
  type CardanoSwapVenueConfig,
} from "./swap-venue.js";

export interface CardanoHotWallet {
  address: string;
  signTx(cbor: string, partialSign?: boolean): Promise<string>;
  submitTx(cbor: string): Promise<string>;
}

export interface DexHunterEstimatePayload {
  token_in: string;
  token_out: string;
  amount_in: number;
  slippage: number;
  blacklisted_dexes: string[];
}

export interface DexHunterEstimateResponse {
  total_output: number;
  total_output_without_slippage: number;
  possible_routes: Array<{
    dex: string;
    amount_in: number;
    expected_output: number;
  }>;
}

export interface DexHunterBuildPayload extends DexHunterEstimatePayload {
  buyer_address: string;
}

export interface DexHunterBuildResponse {
  cbor: string;
  total_input: number;
  total_output: number;
  splits: Array<{
    dex: string;
    amount_in: number;
    expected_output: number;
  }>;
}

export interface DexHunterSignResponse {
  cbor: string;
}

export interface DexHunterIntentExecutionParams {
  intent: ExecutionIntent;
  routes: RouteSpec[];
  wallet: CardanoHotWallet;
  assetTokenIds: Record<string, string>;
  nowUs: number;
  blacklistedDexes?: string[];
}

export interface DexHunterExecutionArtifacts {
  quote: DexHunterEstimateResponse;
  build: DexHunterBuildResponse;
  signedCbor: string;
  revenueBreakdown: RevenueBreakdown;
}

export interface DexHunterExecutionOutcome extends DexHunterExecutionArtifacts {
  result: ExecutionResult;
}

export interface DexHunterLiveAdapterConfig {
  venueConfig: CardanoSwapVenueConfig;
  maxTotalFeeBps: number;
  protocolFeeMode: string;
}

export class DexHunterLiveError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type FetchLike = typeof fetch;

export class DexHunterApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly partnerId: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private get headers() {
    if (!this.partnerId) {
      throw new DexHunterLiveError(
        "DEXHUNTER_PARTNER_ID_MISSING",
        "DexHunter requires an X-Partner-Id header for API requests",
      );
    }

    return {
      "Content-Type": "application/json",
      "X-Partner-Id": this.partnerId,
    };
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new DexHunterLiveError(
        "DEXHUNTER_HTTP_ERROR",
        `DexHunter request failed (${response.status}) for ${path}`,
      );
    }

    return (await response.json()) as T;
  }

  estimateSwap(payload: DexHunterEstimatePayload) {
    return this.postJson<DexHunterEstimateResponse>("/swap/estimate", payload);
  }

  buildSwap(payload: DexHunterBuildPayload) {
    return this.postJson<DexHunterBuildResponse>("/swap/build", payload);
  }

  signSwap(txCbor: string, signatures: string) {
    return this.postJson<DexHunterSignResponse>("/swap/sign", {
      txCbor,
      signatures,
    });
  }
}

function resolveTokenId(assetId: string, assetTokenIds: Record<string, string>): string {
  if (assetId === "ada") {
    return "";
  }

  const tokenId = assetTokenIds[assetId];
  if (!tokenId) {
    throw new DexHunterLiveError(
      "TOKEN_ID_MISSING",
      `Asset ${assetId} is missing a DexHunter token identifier`,
    );
  }

  return tokenId;
}

function resolveRoute(intent: ExecutionIntent, routes: RouteSpec[]): RouteSpec {
  const route = routes.find((candidate) => candidate.routeId === intent.routeId);
  if (!route) {
    throw new DexHunterLiveError(
      "ROUTE_NOT_FOUND",
      `Route ${intent.routeId} is not available for DexHunter execution`,
    );
  }

  return route;
}

function computeAveragePrice(soldAmount: number, boughtAmount: number): number {
  if (soldAmount <= 0 || boughtAmount <= 0) {
    return 0;
  }

  return Number((boughtAmount / soldAmount).toFixed(8));
}

export class DexHunterLiveAdapter {
  private readonly client: DexHunterApiClient;
  private readonly config: DexHunterLiveAdapterConfig;

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    config: Partial<DexHunterLiveAdapterConfig> = {},
  ) {
    const venueConfig = config.venueConfig ?? getCardanoSwapVenueConfig();
    this.config = {
      venueConfig,
      maxTotalFeeBps: config.maxTotalFeeBps ?? runtimeEnv.cardanoMaxTotalFeeBps,
      protocolFeeMode: config.protocolFeeMode ?? runtimeEnv.cardanoProtocolFeeMode,
    };
    this.client = new DexHunterApiClient(
      venueConfig.dexHunter.baseUrl,
      venueConfig.dexHunter.partnerId,
      this.fetchImpl,
    );
  }

  buildIntentPayload(params: DexHunterIntentExecutionParams): DexHunterBuildPayload {
    const route = resolveRoute(params.intent, params.routes);

    return {
      buyer_address: params.wallet.address,
      token_in: resolveTokenId(params.intent.sourceAssetId, params.assetTokenIds),
      token_out: resolveTokenId(params.intent.destinationAssetId, params.assetTokenIds),
      amount_in: params.intent.maxSellAmount,
      slippage: Number((route.maxSlippageBps / 100).toFixed(2)),
      blacklisted_dexes: params.blacklistedDexes ?? [],
    };
  }

  estimateRevenue(totalOutput: number): RevenueBreakdown {
    return applyRevenueFees(
      totalOutput,
      buildProtocolFeePolicy({
        provider: "dexhunter",
        venueFeePercent: getConfiguredVenueFeePercent(this.config.venueConfig),
        protocolFeeBps: this.config.venueConfig.protocolFeeBps,
        maxTotalFeeBps: this.config.maxTotalFeeBps,
        protocolFeeMode: this.config.protocolFeeMode,
      }),
    );
  }

  async executeIntent(params: DexHunterIntentExecutionParams): Promise<DexHunterExecutionOutcome> {
    if (this.config.venueConfig.provider !== "dexhunter") {
      throw new DexHunterLiveError(
        "DEXHUNTER_NOT_PRIMARY_PROVIDER",
        "Current runtime configuration is not set to DexHunter",
      );
    }
    if (params.nowUs < params.intent.createdAtUs) {
      throw new DexHunterLiveError(
        "INTENT_NOT_YET_VALID",
        `Execution intent ${params.intent.intentId} is not yet valid`,
      );
    }
    if (params.nowUs > params.intent.expiryUs) {
      throw new DexHunterLiveError(
        "INTENT_EXPIRED",
        `Execution intent ${params.intent.intentId} has expired`,
      );
    }

    const payload = this.buildIntentPayload(params);
    const quote = await this.client.estimateSwap({
      token_in: payload.token_in,
      token_out: payload.token_out,
      amount_in: payload.amount_in,
      slippage: payload.slippage,
      blacklisted_dexes: payload.blacklisted_dexes,
    });

    if (quote.total_output < params.intent.minBuyAmount) {
      throw new DexHunterLiveError(
        "QUOTE_BELOW_MIN_BUY",
        `DexHunter quote ${quote.total_output} is below min buy ${params.intent.minBuyAmount}`,
      );
    }

    const build = await this.client.buildSwap(payload);
    if (build.total_output < params.intent.minBuyAmount) {
      throw new DexHunterLiveError(
        "BUILD_BELOW_MIN_BUY",
        `DexHunter build output ${build.total_output} is below min buy ${params.intent.minBuyAmount}`,
      );
    }

    const signatures = await params.wallet.signTx(build.cbor, true);
    const signed = await this.client.signSwap(build.cbor, signatures);
    const txHash = await params.wallet.submitTx(signed.cbor);
    const revenueBreakdown = this.estimateRevenue(build.total_output);

    return {
      quote,
      build,
      signedCbor: signed.cbor,
      revenueBreakdown,
      result: {
        intentId: params.intent.intentId,
        vaultId: params.intent.vaultId,
        chainId: "cardano",
        sourceAssetId: params.intent.sourceAssetId,
        destinationAssetId: params.intent.destinationAssetId,
        soldAmount: build.total_input,
        boughtAmount: build.total_output,
        averagePrice: computeAveragePrice(build.total_input, build.total_output),
        txHash,
        executedAtUs: params.nowUs,
        routeId: params.intent.routeId,
      },
    };
  }
}
