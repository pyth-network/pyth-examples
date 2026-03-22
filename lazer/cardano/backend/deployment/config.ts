import { Blockfrost, Lucid, type LucidEvolution } from "@lucid-evolution/lucid";
import "dotenv/config";

export interface Config {
  blockfrostProjectId: string;
  sponsorSeedPhrase: string;
  pythPolicyId: string;
  pythLazerToken: string;
  network: "Preprod" | "Mainnet";
  blockfrostUrl: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    blockfrostProjectId: requireEnv("BLOCKFROST_PROJECT_ID"),
    sponsorSeedPhrase: requireEnv("SPONSOR_SEED_PHRASE"),
    pythPolicyId: requireEnv("PYTH_POLICY_ID"),
    pythLazerToken: requireEnv("PYTH_LAZER_TOKEN"),
    network: "Preprod",
    blockfrostUrl: "https://cardano-preprod.blockfrost.io/api/v0",
  };
}

export async function initLucid(config: Config): Promise<LucidEvolution> {
  const lucid = await Lucid(
    new Blockfrost(config.blockfrostUrl, config.blockfrostProjectId),
    config.network,
  );
  lucid.selectWallet.fromPrivateKey(config.sponsorSeedPhrase);
  return lucid;
}
