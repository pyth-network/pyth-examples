import crypto from "node:crypto";
import { buildSolarSettlementQuote } from "@packages/solarchain-domain";
import type { SolarSnapshotRecord } from "@packages/shared-types";
import { solarDemoBatch, solarDemoClimate, solarDemoReferencePrice, solarDemoSite } from "../demo-data.js";
import { MemorySolarSnapshotRepository } from "./memory.js";
import { PostgresSolarSnapshotRepository } from "./postgres.js";
import type { SolarSnapshotRepository } from "./types.js";
function buildSeedSnapshot(): SolarSnapshotRecord { const quote = buildSolarSettlementQuote(solarDemoBatch); return { snapshotId: crypto.randomUUID(), siteId: solarDemoSite.siteId, batch: solarDemoBatch, quote, climate: solarDemoClimate, referencePrice: solarDemoReferencePrice, createdAt: quote.createdAt }; }
export async function createSolarSnapshotRepository(): Promise<SolarSnapshotRepository> { const databaseUrl = process.env.DATABASE_URL?.trim(); if (!databaseUrl) return new MemorySolarSnapshotRepository([buildSeedSnapshot()]); try { const repository = new PostgresSolarSnapshotRepository(databaseUrl); await repository.ensureReady(); const existing = await repository.list(1); if (existing.length === 0) await repository.create(buildSeedSnapshot()); return repository; } catch (error) { console.error("PostgreSQL no disponible. Se usa fallback en memoria para la demo.", error); return new MemorySolarSnapshotRepository([buildSeedSnapshot()]); } }
export type { SolarSnapshotRepository } from "./types.js";
