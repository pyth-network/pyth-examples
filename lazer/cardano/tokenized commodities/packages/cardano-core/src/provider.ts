import { Blockfrost } from "lucid-cardano";
import { readEnv } from "@packages/config";

export function createBlockfrostProvider() {
  const env = readEnv();
  return new Blockfrost(env.BLOCKFROST_PREPROD_URL, env.BLOCKFROST_PROJECT_ID);
}
