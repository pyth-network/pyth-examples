import crypto from "node:crypto";

export const HACKATHON_METADATA_LABEL = 674;

export function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function buildHackathonMetadata(product: "solarchain" | "commodities", payload: Record<string, unknown>) {
  return {
    [HACKATHON_METADATA_LABEL]: {
      product,
      schema: "iohk-buenos-aires-hackathon-v1",
      payload
    }
  };
}
