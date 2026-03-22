import type { SolarBatch } from "@packages/shared-types";

export function validateSolarBatch(batch: SolarBatch): void {
  if (batch.readings.length === 0) {
    throw new Error("SolarBatch inválido: no hay lecturas");
  }

  for (const reading of batch.readings) {
    if (reading.generatedWh < 0 || reading.consumedWh < 0) {
      throw new Error(`Lectura inválida para meter ${reading.meterId}: energía negativa`);
    }
  }

  if (!batch.beneficiaryAddress.startsWith("addr")) {
    throw new Error("beneficiaryAddress no parece una address Cardano válida");
  }
}
