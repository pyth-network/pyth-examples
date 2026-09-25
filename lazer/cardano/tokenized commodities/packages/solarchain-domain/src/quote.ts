import { sha256Hex } from "@packages/cardano-core";
import type { SolarBatch, SolarSettlementQuote } from "@packages/shared-types";
import { validateSolarBatch } from "./validation.js";

export function buildSolarSettlementQuote(batch: SolarBatch): SolarSettlementQuote {
  validateSolarBatch(batch);

  const totalGeneratedWh = batch.readings.reduce((acc, item) => acc + item.generatedWh, 0);
  const totalConsumedWh = batch.readings.reduce((acc, item) => acc + item.consumedWh, 0);
  const exportedWh = Math.max(totalGeneratedWh - totalConsumedWh, 0);
  const tariffUsdPerKwh = batch.tariffUsdPerKwh ?? 0.1;
  const savingsUsd = (exportedWh / 1000) * tariffUsdPerKwh;
  const avoidedCo2Kg = (exportedWh / 1000) * (batch.emissionFactorKgCo2eAvoided ?? 0.42);
  const tokenUnits = BigInt(Math.floor(exportedWh));
  const batchHash = sha256Hex(JSON.stringify(batch));

  return {
    batchId: batch.batchId,
    totalGeneratedWh,
    totalConsumedWh,
    exportedWh,
    savingsUsd: Number(savingsUsd.toFixed(2)),
    avoidedCo2Kg: Number(avoidedCo2Kg.toFixed(2)),
    tokenUnits,
    batchHash,
    createdAt: new Date().toISOString()
  };
}
