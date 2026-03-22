import { type LucidEvolution } from "@lucid-evolution/lucid";
import "dotenv/config";
export interface Config {
    blockfrostProjectId: string;
    sponsorSeedPhrase: string;
    pythPolicyId: string;
    pythLazerToken: string;
    network: "Preprod" | "Mainnet";
    blockfrostUrl: string;
}
export declare function loadConfig(): Config;
export declare function initLucid(config: Config): Promise<LucidEvolution>;
