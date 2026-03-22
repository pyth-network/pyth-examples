import { z } from "zod";

export const appEnvSchema = z.object({
  CARDANO_NETWORK: z.enum(["PreProd", "Preview", "Mainnet"]).default("PreProd"),
  BLOCKFROST_PREPROD_URL: z.string().url(),
  BLOCKFROST_PROJECT_ID: z.string().min(1),
  CARDANO_MNEMONIC: z.string().min(1).optional(),
  PYTH_API_TOKEN: z.string().min(1),
  PYTH_POLICY_ID_PREPROD: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SOLARCHAIN_PRICE_FEED_ID: z.coerce.number().default(16),
  COMMODITIES_PRICE_FEED_ID: z.coerce.number().default(16)
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return appEnvSchema.parse(source);
}
