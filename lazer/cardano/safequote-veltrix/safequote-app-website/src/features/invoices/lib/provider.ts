import { BlockfrostProvider } from "@meshsdk/core";

export function createBlockfrostProvider() {
  const projectId = process.env.NEXT_PUBLIC_BLOCKFROST_PREPROD_PROJECT_ID;

  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_BLOCKFROST_PREPROD_PROJECT_ID");
  }

  return new BlockfrostProvider(projectId);
}
