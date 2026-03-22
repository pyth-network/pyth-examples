import { HACKATHON_METADATA_LABEL } from "@packages/cardano-core";
import type { CommoditySettlementQuote, CommoditySettlementTxDraft } from "@packages/shared-types";

export function buildSettlementTxDraft(params: {
  agreementId: string;
  buyerAddress: string;
  sellerAddress: string;
  quote?: CommoditySettlementQuote;
  dispute: boolean;
}): CommoditySettlementTxDraft {
  if (params.dispute || !params.quote) {
    return {
      agreementId: params.agreementId,
      action: "DISPUTE",
      scriptName: "commodity_escrow",
      signers: [params.buyerAddress, params.sellerAddress],
      referenceInputs: ["pyth-state-utxo"],
      metadataLabel: HACKATHON_METADATA_LABEL,
      requiresOraclePayload: true,
      notes: [
        "No construir submit automático.",
        "Persistir evidencia off-chain y disparar revisión manual o fallback rule."
      ]
    };
  }

  return {
    agreementId: params.agreementId,
    action: "SETTLE",
    scriptName: "commodity_escrow",
    signers: [params.buyerAddress, params.sellerAddress],
    referenceInputs: ["pyth-state-utxo"],
    metadataLabel: HACKATHON_METADATA_LABEL,
    requiresOraclePayload: true,
    payoutDirection: params.quote.payoutDirection,
    variationUsd: params.quote.variationUsd,
    requiredCollateralAda: params.quote.requiredCollateralAda,
    notes: [
      "Adjuntar signed payload de Pyth como prueba primaria.",
      "Consumir UTxO del escrow con datum del acuerdo.",
      "Aplicar pago cash-settled según payoutDirection y variationUsd."
    ]
  };
}
