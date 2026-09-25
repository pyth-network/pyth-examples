import { Lucid, selectWalletFromSeed } from "lucid-cardano";
import { createBlockfrostProvider } from "./provider.js";
import { readEnv } from "@packages/config";

export async function createLucidClient() {
  const env = readEnv();
  const provider = createBlockfrostProvider();
  const lucid = await Lucid.new(provider, env.CARDANO_NETWORK);

  if (env.CARDANO_MNEMONIC) {
    lucid.selectWalletFromSeed(env.CARDANO_MNEMONIC);
  }

  return lucid;
}

export async function getWalletAddress() {
  const lucid = await createLucidClient();
  return lucid.wallet.address();
}

export async function getUtxos() {
  const lucid = await createLucidClient();
  return lucid.wallet.getUtxos();
}
