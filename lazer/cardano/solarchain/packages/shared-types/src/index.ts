export type UtcIsoString = string;
export type SolarAllocationRule = "EXPORTED_ENERGY_ONLY";
export type RepositoryMode = "postgres" | "memory";

export interface MeterReading { meterId: string; timestamp: UtcIsoString; generatedWh: number; consumedWh: number; irradianceWm2?: number; inverterId?: string; }
export interface SolarBatch { batchId: string; producerId: string; beneficiaryAddress: string; periodStart: UtcIsoString; periodEnd: UtcIsoString; readings: MeterReading[]; emissionFactorKgCo2eAvoided?: number; tariffUsdPerKwh?: number; allocationRule?: SolarAllocationRule; }
export interface SolarSettlementQuote { batchId: string; allocationRuleApplied: SolarAllocationRule; totalGeneratedWh: number; totalConsumedWh: number; exportedWh: number; assignableWh: number; settlementSKwh: number; savingsUsd: number; avoidedCo2Kg: number; tokenUnits: string; unit: "sKWh"; batchHash: string; createdAt: UtcIsoString; }
export interface SolarClimateSnapshot { temperatureC: number; cloudCoverPct: number; irradianceWm2?: number; source: "weather-adapter" | "demo"; capturedAt: UtcIsoString; }
export interface SolarReferencePriceSnapshot { arsUsd: number; electricityArsPerKwh: number; source: "pyth" | "demo"; capturedAt: UtcIsoString; }
export interface SolarSiteProfile { siteId: string; displayName: string; locationLabel: string; systemCapacityKw: number; status: "LIVE" | "DEGRADED" | "OFFLINE"; allocationRule: SolarAllocationRule; settlementUnit: "sKWh"; }
export interface SolarSnapshotRecord { snapshotId: string; siteId: string; batch: SolarBatch; quote: SolarSettlementQuote; climate: SolarClimateSnapshot; referencePrice: SolarReferencePriceSnapshot; createdAt: UtcIsoString; }
export interface SolarDashboardSeriesPoint { snapshotId: string; createdAt: UtcIsoString; assignableWh: number; settlementSKwh: number; savingsUsd: number; }
export interface SolarDashboardSummary { site: SolarSiteProfile; repositoryMode: RepositoryMode; latestSnapshot: SolarSnapshotRecord | null; totals: { snapshotCount: number; totalAssignableWh: number; totalSettlementSKwh: number; totalSavingsUsd: number; totalAvoidedCo2Kg: number; }; recentSeries: SolarDashboardSeriesPoint[]; }
export interface SolarEvidenceExport { snapshotId: string; siteId: string; batchId: string; allocationRuleApplied: SolarAllocationRule; settlementUnit: "sKWh"; createdAt: UtcIsoString; batchHash: string; evidence: { batch: SolarBatch; quote: SolarSettlementQuote; climate: SolarClimateSnapshot; referencePrice: SolarReferencePriceSnapshot; }; }
export interface SolarIngestSnapshotInput { siteId?: string; batch: SolarBatch; climate: SolarClimateSnapshot; referencePrice: SolarReferencePriceSnapshot; }
export interface SignedPriceUpdate { priceFeedId: number; channel: string; payloadHex: string; fetchedAt: UtcIsoString; }
export interface ChainSubmissionResult { txHash: string; network: string; metadataLabel?: number; }
