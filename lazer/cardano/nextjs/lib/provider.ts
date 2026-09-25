import { BlockfrostProvider } from "@meshsdk/core";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY ?? "";

let _provider: BlockfrostProvider | null = null;

export function getProvider(): BlockfrostProvider {
  if (!_provider) {
    _provider = new BlockfrostProvider(PROJECT_ID);
  }
  return _provider;
}
