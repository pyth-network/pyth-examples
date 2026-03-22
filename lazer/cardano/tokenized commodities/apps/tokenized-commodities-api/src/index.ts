import Fastify from "fastify";
import { buildHackathonMetadata, HACKATHON_METADATA_LABEL } from "@packages/cardano-core";
import {
  CommodityDomainError,
  buildCommoditySettlementQuote,
  isOracleUsableForSettlement,
  normalizeAgreement
} from "@packages/commodities-domain";
import type {
  ApiErrorBody,
  CommodityQuoteRequest,
  CommodityQuoteResponse,
  PrepareSettlementResponse
} from "@packages/shared-types";
import { auditEvent } from "./lib/audit.js";
import { toJsonSafe } from "./lib/json.js";
import { resolveCommodityOracle } from "./lib/oracle.js";
import { buildSettlementTxDraft } from "./lib/settlement-draft.js";

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

app.addHook("onRequest", async (request, reply) => {
  reply.header("access-control-allow-origin", "*");
  reply.header("access-control-allow-methods", "GET,POST,OPTIONS");
  reply.header("access-control-allow-headers", "content-type");
  if (request.method === "OPTIONS") await reply.code(204).send();
});

app.setErrorHandler(async (error, request, reply) => {
  request.log.error({ err: error }, "tokenized-commodities request failed");
  const payload: ApiErrorBody = {
    ok: false,
    error: {
      code: error instanceof CommodityDomainError ? error.code : "INTERNAL_ERROR",
      message: error.message,
      details: error instanceof CommodityDomainError ? error.details : undefined
    }
  };
  return reply.code(error instanceof CommodityDomainError ? 400 : 500).send(toJsonSafe(payload));
});

app.get("/health", async () => toJsonSafe({ ok: true, product: "tokenized-commodities", now: new Date().toISOString() }));

app.get("/manifest", async () =>
  toJsonSafe({
    ok: true,
    product: "tokenized-commodities",
    positioning: "private bilateral commodity-linked agreement infrastructure",
    network: "Cardano PreProd",
    rails: ["Aiken", "Lucid", "Fastify", "Next.js", "Pyth"],
    scope: {
      included: [
        "Bilateral programmable agreement",
        "Cash-settled settlement quote",
        "Collateral sufficiency check",
        "Oracle freshness and fallback",
        "Settlement tx draft",
        "Audit trail"
      ],
      excluded: [
        "Exchange or marketplace",
        "Physical delivery",
        "Public offering narrative",
        "Freely transferable investment token",
        "Custody stack",
        "Advanced margin engine"
      ]
    }
  })
);

app.post<{ Body: { agreement: CommodityQuoteRequest["agreement"] } }>("/agreements/validate", async (request, reply) => {
  const agreement = normalizeAgreement(request.body.agreement);
  request.log.info({ agreementId: agreement.agreementId, commodity: agreement.commodity, expiresAt: agreement.expiresAt }, "agreement validated");
  return reply.send(toJsonSafe({ ok: true, agreement }));
});

app.post<{ Body: CommodityQuoteRequest }>("/agreements/quote", async (request, reply) => {
  const auditTrail = [auditEvent("REQUEST", "INFO", "Quote request recibido")];
  const agreement = normalizeAgreement(request.body.agreement);
  const oracle = await resolveCommodityOracle(request.body);
  auditTrail.push(
    auditEvent("AGREEMENT_VALIDATION", "INFO", "Agreement normalizado", { agreementId: agreement.agreementId, commodity: agreement.commodity }),
    auditEvent("ORACLE_RESOLUTION", oracle.settlement.status === "OK" ? "INFO" : "WARN", oracle.settlement.reason ?? "oracle resolved", {
      primaryStatus: oracle.primaryStatus,
      fallbackUsed: oracle.fallbackUsed,
      settlementSource: oracle.settlement.source,
      freshnessSeconds: oracle.settlement.freshnessSeconds
    })
  );
  if (!isOracleUsableForSettlement(oracle.settlement)) {
    const response: CommodityQuoteResponse = {
      ok: true,
      mode: "DISPUTE",
      agreement,
      oracle,
      auditTrail: [...auditTrail, auditEvent("DISPUTE", "WARN", "No hay dato confiable de pricing. El acuerdo debe ir a dispute/fallback")]
    };
    request.log.warn({ agreementId: agreement.agreementId, oracleStatus: oracle.settlement.status }, "quote moved to dispute");
    return reply.code(409).send(toJsonSafe(response));
  }
  const quote = buildCommoditySettlementQuote({ agreement, oracle: oracle.settlement, demoAdaUsdFx: request.body.demoAdaUsdFx });
  const response: CommodityQuoteResponse = {
    ok: true,
    mode: quote.collateralizationStatus === "SUFFICIENT" ? "QUOTE" : "DISPUTE",
    agreement,
    quote,
    oracle,
    auditTrail: [
      ...auditTrail,
      auditEvent(
        "SETTLEMENT_QUOTE",
        quote.collateralizationStatus === "SUFFICIENT" ? "INFO" : "WARN",
        quote.collateralizationStatus === "SUFFICIENT" ? "Settlement quote calculado" : "Settlement quote calculado pero el colateral es insuficiente",
        {
          variationUsd: quote.variationUsd,
          payoutDirection: quote.payoutDirection,
          requiredCollateralAda: quote.requiredCollateralAda.toString(),
          collateralAda: quote.collateralAda.toString()
        }
      )
    ]
  };
  request.log.info({ agreementId: agreement.agreementId, payoutDirection: quote.payoutDirection, variationUsd: quote.variationUsd, collateralizationStatus: quote.collateralizationStatus }, "quote built");
  return reply.code(response.mode === "QUOTE" ? 200 : 409).send(toJsonSafe(response));
});

app.post<{ Body: CommodityQuoteRequest }>("/agreements/prepare-settlement", async (request, reply) => {
  const agreement = normalizeAgreement(request.body.agreement);
  const oracle = await resolveCommodityOracle(request.body);
  const auditTrail = [
    auditEvent("REQUEST", "INFO", "Prepare-settlement request recibido"),
    auditEvent("AGREEMENT_VALIDATION", "INFO", "Agreement normalizado", { agreementId: agreement.agreementId })
  ];
  if (!isOracleUsableForSettlement(oracle.settlement)) {
    const txDraft = buildSettlementTxDraft({ agreementId: agreement.agreementId, buyerAddress: agreement.buyerAddress, sellerAddress: agreement.sellerAddress, dispute: true });
    const response: PrepareSettlementResponse = {
      ok: true,
      mode: "DISPUTE",
      agreement,
      oracle,
      txDraft,
      auditTrail: [...auditTrail, auditEvent("DISPUTE", "WARN", "Settlement bloqueado por falta de pricing confiable")]
    };
    request.log.warn({ agreementId: agreement.agreementId }, "prepare-settlement moved to dispute");
    return reply.code(409).send(toJsonSafe(response));
  }
  const quote = buildCommoditySettlementQuote({ agreement, oracle: oracle.settlement, demoAdaUsdFx: request.body.demoAdaUsdFx });
  const metadata = buildHackathonMetadata("commodities", {
    agreementId: quote.agreementId,
    commodity: quote.commodity,
    oraclePriceUsd: quote.oraclePriceUsd,
    settlementPriceUsd: quote.settlementPriceUsd,
    variationUsd: quote.variationUsd,
    payoutDirection: quote.payoutDirection,
    collateralizationStatus: quote.collateralizationStatus
  });
  const dispute = quote.collateralizationStatus !== "SUFFICIENT";
  const txDraft = buildSettlementTxDraft({ agreementId: agreement.agreementId, buyerAddress: agreement.buyerAddress, sellerAddress: agreement.sellerAddress, quote, dispute });
  const response: PrepareSettlementResponse = {
    ok: true,
    mode: dispute ? "DISPUTE" : "READY_TO_BUILD",
    agreement,
    quote,
    oracle,
    metadataLabel: HACKATHON_METADATA_LABEL,
    metadata,
    txDraft,
    auditTrail: [
      ...auditTrail,
      auditEvent(
        "SETTLEMENT_PREP",
        dispute ? "WARN" : "INFO",
        dispute ? "Settlement preparado en modo dispute por colateral insuficiente" : "Settlement draft preparado para construcción de tx",
        { payoutDirection: quote.payoutDirection, variationUsd: quote.variationUsd, requiredCollateralAda: quote.requiredCollateralAda.toString() }
      )
    ]
  };
  request.log.info({ agreementId: agreement.agreementId, mode: response.mode, payoutDirection: quote.payoutDirection, variationUsd: quote.variationUsd }, "prepare-settlement built");
  return reply.code(dispute ? 409 : 200).send(toJsonSafe(response));
});

app.listen({ port: 4020, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
