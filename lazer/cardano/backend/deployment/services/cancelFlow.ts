import { paymentCredentialOf } from "@lucid-evolution/lucid";
import { loadConfig, initLucid } from "../config.js";
import { buildValidator } from "../validator.js";
import { cancel } from "../transactions/cancel.js";

export interface ExecuteCancelParams {
  usdAmountCents: bigint;
  userAddress: string;
}

export interface ExecuteCancelResult {
  txHash: string;
  sponsorAddress: string;
  usdAmountCents: bigint;
}

function extractPaymentCredentialHash(addressInput: string): string {
  if (addressInput.startsWith("addr")) {
    return paymentCredentialOf(addressInput).hash;
  }

  if (!/^[0-9a-fA-F]+$/.test(addressInput)) {
    throw new Error("User address must be bech32 (addr...) or hex bytes.");
  }

  const rawAddress = Buffer.from(addressInput, "hex");
  if (rawAddress.length < 29) {
    throw new Error("User address hex is too short to extract payment credential.");
  }

  const addressType = rawAddress[0] >> 4;
  if (addressType > 7) {
    throw new Error("Unsupported address type in user address hex.");
  }

  return rawAddress.subarray(1, 29).toString("hex");
}

export async function executeCancelFlow(
  params: ExecuteCancelParams,
): Promise<ExecuteCancelResult> {
  // This mirrors scripts/cancel.ts from loadConfig() onward.
  const config = loadConfig();
  const lucid = await initLucid(config);

  const sponsorAddress = await lucid.wallet().address();
  const sponsorCred = paymentCredentialOf(sponsorAddress);
  const userPaymentKeyHash = extractPaymentCredentialHash(params.userAddress);

  const validator = buildValidator({
    usdAmountCents: params.usdAmountCents,
    userPaymentKeyHash,
    sponsorPaymentKeyHash: sponsorCred.hash,
    pythPolicyId: config.pythPolicyId,
  });

  const txHash = await cancel(lucid, config, {
    validator,
    sponsorAddress,
  });

  return {
    txHash,
    sponsorAddress,
    usdAmountCents: params.usdAmountCents,
  };
}
