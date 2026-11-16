import { readEnv } from "@packages/config";
import type { SignedPriceUpdate } from "@packages/shared-types";

export async function fetchSignedPriceUpdate(priceFeedId: number): Promise<SignedPriceUpdate> { const env = readEnv(); void env; return { priceFeedId, channel: "pyth-lazer", payloadHex: "", fetchedAt: new Date().toISOString() }; }
