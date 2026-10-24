import { paymentCredentialOf } from "@lucid-evolution/lucid";
import { loadConfig, initLucid } from "../config.js";
import { buildValidator, getScriptAddress } from "../validator.js";
import { lock } from "../transactions/lock.js";

export interface ExecuteLockParams {
  usdAmountCents: bigint;
  userAddress: string;
  lovelaceToLock: bigint;
}

export interface ExecuteLockResult {
  txHash: string;
  sponsorAddress: string;
  scriptAddress: string;
  usdAmountCents: bigint;
  lovelaceToLock: bigint;
  pythPolicyId: string;
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

export async function executeLockFlow(params: ExecuteLockParams): Promise<ExecuteLockResult> {
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
  const scriptAddress = getScriptAddress(validator, config.network);

  const txHash = await lock(lucid, config, {
    validator,
    lovelaceAmount: params.lovelaceToLock,
  });

  return {
    txHash,
    sponsorAddress,
    scriptAddress,
    usdAmountCents: params.usdAmountCents,
    lovelaceToLock: params.lovelaceToLock,
    pythPolicyId: config.pythPolicyId,
  };
}
