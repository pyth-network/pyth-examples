import Fastify from "fastify";
import { readEnv } from "@packages/config";
import { buildCommoditySettlementQuote } from "@packages/commodities-domain";
import { buildHackathonMetadata, HACKATHON_METADATA_LABEL } from "@packages/cardano-core";
import { fetchSignedPriceUpdate } from "@packages/pyth-adapter";
import type { CommodityAgreement } from "@packages/shared-types";

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  ok: true,
  product: "tokenized-commodities",
  now: new Date().toISOString()
}));

app.post<{ Body: CommodityAgreement }>("/agreements/quote", async (request, reply) => {
  const env = readEnv();
  const signedUpdate = await fetchSignedPriceUpdate(request.body.referencePriceFeedId || env.COMMODITIES_PRICE_FEED_ID);

  /**
   * Para no mentirte: el payload firmado trae bytes, no una cotización legible inmediata
   * para negocio. Para demo rápida usamos un precio de referencia del request
   * o un precio mockeado. En producción, acá se decodifica o se consulta una capa
   * off-chain adicional que exponga el valor ya parseado.
   */
  const oraclePriceUsd = Number(request.headers["x-demo-oracle-price-usd"] ?? 250);
  const quote = buildCommoditySettlementQuote(request.body, oraclePriceUsd);

  return reply.send({
    quote,
    signedUpdate
  });
});

app.post<{ Body: CommodityAgreement }>("/agreements/prepare-settlement", async (request, reply) => {
  const oraclePriceUsd = Number(request.headers["x-demo-oracle-price-usd"] ?? 250);
  const quote = buildCommoditySettlementQuote(request.body, oraclePriceUsd);
  const signedUpdate = await fetchSignedPriceUpdate(request.body.referencePriceFeedId);

  const metadata = buildHackathonMetadata("commodities", {
    agreementId: quote.agreementId,
    oraclePriceUsd: quote.oraclePriceUsd,
    effectiveSettlementPriceUsd: quote.effectiveSettlementPriceUsd,
    variationUsd: quote.variationUsd,
    payoutDirection: quote.payoutDirection
  });

  return reply.send({
    product: "tokenized-commodities",
    quote,
    signedUpdate,
    metadataLabel: HACKATHON_METADATA_LABEL,
    metadata,
    nextAction: "build_tx_with_zero_withdrawal_and_reference_input"
  });
});

app.listen({ port: 4020, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
