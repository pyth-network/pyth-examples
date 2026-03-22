export type UtcIsoString = string;
export type Lovelace = bigint;
export type LovelaceInput = string | number | bigint;

export interface MeterReading {
  meterId: string;
  timestamp: UtcIsoString;
  generatedWh: number;
  consumedWh: number;
  irradianceWm2?: number;
  inverterId?: string;
}

export interface SolarBatch {
  batchId: string;
  producerId: string;
  beneficiaryAddress: string;
  periodStart: UtcIsoString;
  periodEnd: UtcIsoString;
  readings: MeterReading[];
  emissionFactorKgCo2eAvoided?: number;
  tariffUsdPerKwh?: number;
}

export interface SolarSettlementQuote {
  batchId: string;
  totalGeneratedWh: number;
  totalConsumedWh: number;
  exportedWh: number;
  savingsUsd: number;
  avoidedCo2Kg: number;
  tokenUnits: bigint;
  batchHash: string;
  createdAt: UtcIsoString;
}

export type CommodityKind = "WHEAT" | "SOY" | "CORN";
export type CommodityUnit = "TON" | "KG";
export type PayoutDirection = "BUYER_TO_SELLER" | "SELLER_TO_BUYER" | "FLAT";
export type CollateralizationStatus = "SUFFICIENT" | "INSUFFICIENT";
export type OracleSourceKind = "PYTH_PRIMARY" | "DEMO_SECONDARY";
export type OracleStatus = "OK" | "STALE" | "UNAVAILABLE" | "DISPUTED";

export interface CommodityAgreementInput {
  agreementId: string;
  commodity: CommodityKind;
  buyerAddress: string;
  sellerAddress: string;
  quantity: number;
  unit: CommodityUnit;
  referencePriceFeedId: number;
  strikePriceUsd: number;
  floorPriceUsd: number;
  capPriceUsd: number;
  expiresAt: UtcIsoString;
  collateralAda: LovelaceInput;
}

export interface CommodityAgreement {
  agreementId: string;
  commodity: CommodityKind;
  buyerAddress: string;
  sellerAddress: string;
  quantity: number;
  unit: CommodityUnit;
  referencePriceFeedId: number;
  strikePriceUsd: number;
  floorPriceUsd: number;
  capPriceUsd: number;
  expiresAt: UtcIsoString;
  collateralAda: Lovelace;
}

export interface CommoditySettlementQuote {
  agreementId: string;
  commodity: CommodityKind;
  quantity: number;
  unit: CommodityUnit;
  strikePriceUsd: number;
  floorPriceUsd: number;
  capPriceUsd: number;
  oraclePriceUsd: number;
  settlementPriceUsd: number;
  variationUsd: number;
  payoutDirection: PayoutDirection;
  maxExposureUsd: number;
  requiredCollateralAda: Lovelace;
  collateralAda: Lovelace;
  collateralizationStatus: CollateralizationStatus;
  createdAt: UtcIsoString;
  expiresAt: UtcIsoString;
  demoAdaUsdFx: number;
}

export interface SignedPriceUpdate {
  priceFeedId: number;
  channel: string;
  payloadHex: string;
  fetchedAt: UtcIsoString;
}

export interface OracleObservation {
  source: OracleSourceKind;
  priceUsd: number;
  asOf: UtcIsoString;
  freshnessSeconds: number;
  maxAgeSeconds: number;
  status: OracleStatus;
  reason?: string;
}

export interface CommodityOracleResolution {
  settlement: OracleObservation;
  fallbackUsed: boolean;
  primaryStatus: "AVAILABLE" | "UNAVAILABLE";
  primaryReason?: string;
  primarySignedUpdate?: SignedPriceUpdate;
}

export interface CommodityAuditEvent {
  at: UtcIsoString;
  stage: string;
  status: "INFO" | "WARN" | "ERROR";
  detail: string;
  data?: Record<string, unknown>;
}

export interface CommodityQuoteRequest {
  agreement: CommodityAgreementInput;
  demoOraclePriceUsd?: number;
  demoOracleAsOf?: UtcIsoString;
  maxOracleAgeSeconds?: number;
  demoAdaUsdFx?: number;
  allowDemoFallback?: boolean;
}

export interface CommodityQuoteResponse {
  ok: true;
  mode: "QUOTE" | "DISPUTE";
  agreement: CommodityAgreement;
  quote?: CommoditySettlementQuote;
  oracle: CommodityOracleResolution;
  auditTrail: CommodityAuditEvent[];
}

export interface CommoditySettlementTxDraft {
  agreementId: string;
  action: "SETTLE" | "DISPUTE";
  scriptName: "commodity_escrow";
  signers: string[];
  referenceInputs: string[];
  metadataLabel: number;
  requiresOraclePayload: boolean;
  payoutDirection?: PayoutDirection;
  variationUsd?: number;
  requiredCollateralAda?: Lovelace;
  notes: string[];
}

export interface PrepareSettlementResponse {
  ok: true;
  mode: "READY_TO_BUILD" | "DISPUTE";
  agreement: CommodityAgreement;
  quote?: CommoditySettlementQuote;
  oracle: CommodityOracleResolution;
  metadataLabel?: number;
  metadata?: Record<number, unknown>;
  txDraft: CommoditySettlementTxDraft;
  auditTrail: CommodityAuditEvent[];
}

export interface ChainSubmissionResult {
  txHash: string;
  network: string;
  metadataLabel?: number;
}

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  auditTrail?: CommodityAuditEvent[];
}
