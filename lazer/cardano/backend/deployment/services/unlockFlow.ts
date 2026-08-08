import { Address, createClient } from "@evolution-sdk/evolution";
import { paymentCredentialOf } from "@lucid-evolution/lucid";
import { loadConfig } from "../config.js";
import { buildValidator, getScriptAddress } from "../validator.js";
import { unlock } from "../transactions/unlock.js";

function toEvolutionNetwork(network: "Preprod" | "Mainnet"): "preprod" | "mainnet" {
  return network === "Mainnet" ? "mainnet" : "preprod";
}

function normalizeToBech32Address(addressInput: string): string {
  const details = Address.getAddressDetails(addressInput);
  if (!details) {
    throw new Error("User address must be a valid bech32 or hex Cardano address.");
  }
  return details.address.bech32;
}

function normalizeToEnterpriseBech32Address(addressInput: string): string {
  const details = Address.getAddressDetails(addressInput);
  if (!details) {
    throw new Error("User address must be a valid bech32 or hex Cardano address.");
  }

  // The validator is parameterized with payment key hash only (no stake key),
  // so the expected output address is enterprise-form for that payment credential.
  return Address.toBech32(
    new Address.Address({
      networkId: details.networkId,
      paymentCredential: details.paymentCredential,
    }),
  );
}

function extractPaymentCredentialHash(addressInput: string): string {
  if (addressInput.startsWith("addr")) {
    return paymentCredentialOf(addressInput).hash;
  }

  if (!/^[0-9a-fA-F]+$/.test(addressInput)) {
    throw new Error("Address must be bech32 (addr...) or hex bytes.");
  }

  const rawAddress = Buffer.from(addressInput, "hex");
  if (rawAddress.length < 29) {
    throw new Error("Address hex is too short to extract payment credential.");
  }

  const addressType = rawAddress[0] >> 4;
  if (addressType > 7) {
    throw new Error("Unsupported address type in address hex.");
  }

  return rawAddress.subarray(1, 29).toString("hex");
}

export interface ExecuteUnlockParams {
  usdAmountCents: bigint;
  userAddress: string;
  sponsorAddress?: string | null;
  pythPolicyId?: string | null;
  expectedScriptAddress?: string | null;
  expectedLockTxId?: string | null;
}

export interface ExecuteUnlockResult {
  txHash: string;
  sponsorAddress: string;
  userAddress: string;
  usdAmountCents: bigint;
}

export async function executeUnlockFlow(
  params: ExecuteUnlockParams,
): Promise<ExecuteUnlockResult> {
  // This mirrors scripts/unlock.ts from loadConfig() onward.
  const config = loadConfig();
  if (params.pythPolicyId) {
    config.pythPolicyId = params.pythPolicyId;
  }
  const client = createClient({
    network: toEvolutionNetwork(config.network),
    provider: {
      type: "blockfrost",
      baseUrl: config.blockfrostUrl,
      projectId: config.blockfrostProjectId,
    },
  }).attachWallet({
    type: "seed",
    mnemonic: config.sponsorSeedPhrase,
  });

  const walletSponsorAddress = Address.toBech32(await client.address());
  const sponsorAddress = params.sponsorAddress
    ? normalizeToBech32Address(params.sponsorAddress)
    : walletSponsorAddress;
  const normalizedUserAddress = normalizeToBech32Address(params.userAddress);
  const validatorUserAddress = normalizeToEnterpriseBech32Address(params.userAddress);
  const sponsorPaymentKeyHash = extractPaymentCredentialHash(sponsorAddress);
  const userPaymentKeyHash = extractPaymentCredentialHash(params.userAddress);

  const validator = buildValidator({
    usdAmountCents: params.usdAmountCents,
    userPaymentKeyHash,
    sponsorPaymentKeyHash,
    pythPolicyId: config.pythPolicyId,
  });
  const computedScriptAddress = getScriptAddress(validator, config.network);
  if (
    params.expectedScriptAddress &&
    params.expectedScriptAddress !== computedScriptAddress
  ) {
    throw new Error(
      `Request script mismatch. Stored lock script address is ${params.expectedScriptAddress}, but current config resolves to ${computedScriptAddress}. This usually means PYTH_POLICY_ID changed after the request was created.`,
    );
  }

  const txHash = await unlock(client as any, config, {
    validator,
    usdAmountCents: params.usdAmountCents,
    userAddress: validatorUserAddress,
    sponsorAddress,
    expectedLockTxId: params.expectedLockTxId ?? undefined,
  });

  return {
    txHash,
    sponsorAddress,
    userAddress: normalizedUserAddress,
    usdAmountCents: params.usdAmountCents,
  };
}
