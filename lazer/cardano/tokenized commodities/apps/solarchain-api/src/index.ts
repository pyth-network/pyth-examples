import Fastify from "fastify";
import { buildSolarSettlementQuote } from "@packages/solarchain-domain";
import { buildHackathonMetadata, HACKATHON_METADATA_LABEL } from "@packages/cardano-core";
import type { SolarBatch } from "@packages/shared-types";

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  ok: true,
  product: "solarchain",
  now: new Date().toISOString()
}));

app.post<{ Body: SolarBatch }>("/batches/quote", async (request, reply) => {
  const quote = buildSolarSettlementQuote(request.body);
  return reply.send(quote);
});

app.post<{ Body: SolarBatch }>("/batches/prepare-settlement", async (request, reply) => {
  const quote = buildSolarSettlementQuote(request.body);

  const metadata = buildHackathonMetadata("solarchain", {
    batchId: quote.batchId,
    exportedWh: quote.exportedWh,
    avoidedCo2Kg: quote.avoidedCo2Kg,
    savingsUsd: quote.savingsUsd,
    batchHash: quote.batchHash
  });

  /**
   * Acá se debería:
   * 1. cargar el validator exportado por Aiken
   * 2. construir la tx con Lucid
   * 3. agregar metadata CIP / label 674
   * 4. firmar y enviar
   *
   * En un hackathon real se puede devolver una "tx request" para que el front
   * o una wallet service termine el firmado.
   */
  return reply.send({
    product: "solarchain",
    quote,
    metadataLabel: HACKATHON_METADATA_LABEL,
    metadata,
    nextAction: "build_and_sign_cardano_tx"
  });
});

app.listen({ port: 4010, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
