import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { getPythState, getPythScriptHash } from "@pythnetwork/pyth-lazer-cardano-js";
import { readEnv } from "@packages/config";
import type { SignedPriceUpdate } from "@packages/shared-types";

export interface PythCardanoArtifacts {
  policyId: string;
  pythState: unknown;
  pythScriptHash: string;
}

export async function fetchSignedPriceUpdate(priceFeedId: number): Promise<SignedPriceUpdate> {
  const env = readEnv();

  const lazer = await PythLazerClient.create({
    token: env.PYTH_API_TOKEN
  });

  const latestPrice = await lazer.getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: [priceFeedId],
    properties: ["price", "exponent"]
  });

  if (!latestPrice.solana?.data) {
    throw new Error(`Pyth did not return a signed payload for feed ${priceFeedId}`);
  }

  return {
    priceFeedId,
    channel: "fixed_rate@200ms",
    payloadHex: latestPrice.solana.data,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Este helper prepara los datos mínimos exigidos por la integración oficial:
 * - Pyth state UTxO como reference input
 * - hash del withdraw script
 * - policy id del deployment Pyth
 *
 * La construcción exacta de la tx puede variar según el builder. Acá dejamos
 * listo el estado necesario para que el API de cada producto arme la transacción.
 */
export async function getPythCardanoArtifacts(client: unknown): Promise<PythCardanoArtifacts> {
  const env = readEnv();
  const pythState = await getPythState(env.PYTH_POLICY_ID_PREPROD, client as never);
  const pythScriptHash = getPythScriptHash(pythState);

  return {
    policyId: env.PYTH_POLICY_ID_PREPROD,
    pythState,
    pythScriptHash
  };
}
