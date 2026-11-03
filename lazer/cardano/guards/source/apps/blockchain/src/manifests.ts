import path from "node:path";
import { fileURLToPath } from "node:url";

export interface CollaborationSurface {
  chain: "cardano" | "svm" | "evm";
  appRoot: string;
  contractsRoot?: string;
  offchainRoot?: string;
  adapterPackage: string;
  currentSourceOfTruth: string[];
  nextArtifacts: string[];
}

const manifestDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(manifestDir, "../../..");

function fromRoot(...segments: string[]): string {
  return path.join(repoRoot, ...segments);
}

export const blockchainSurface: Record<
  CollaborationSurface["chain"],
  CollaborationSurface
> = {
  cardano: {
    chain: "cardano",
    appRoot: fromRoot("apps", "blockchain", "cardano"),
    contractsRoot: fromRoot("apps", "blockchain", "cardano", "contracts"),
    offchainRoot: fromRoot("apps", "blockchain", "cardano", "offchain"),
    adapterPackage: "@anaconda/cardano",
    currentSourceOfTruth: [
      fromRoot("packages", "cardano", "src", "policy-vault.ts"),
      fromRoot("packages", "cardano", "src", "types.ts"),
      fromRoot("apps", "blockchain", "cardano", "offchain", "collector.ts"),
      fromRoot("apps", "blockchain", "cardano", "offchain", "env.ts"),
      fromRoot("apps", "blockchain", "cardano", "contracts", "aiken", "lib", "guards_one", "policy_vault.ak"),
      fromRoot("apps", "blockchain", "cardano", "contracts", "aiken", "validators", "policy_vault.ak"),
      fromRoot("apps", "backend", "src", "keeper.ts"),
    ],
    nextArtifacts: [
      "Aiken validator for PolicyVault",
      "Execution hot-bucket validator rules",
      "DexHunter live execution wiring",
      "Automatic Pyth State UTxO resolution from Cardano provider",
    ],
  },
  svm: {
    chain: "svm",
    appRoot: fromRoot("apps", "blockchain", "svm"),
    adapterPackage: "@anaconda/svm",
    currentSourceOfTruth: [
      fromRoot("packages", "svm", "src", "index.ts"),
      fromRoot("packages", "svm", "src", "fixtures.ts"),
    ],
    nextArtifacts: [
      "Wallet Standard connector",
      "Jupiter route adapter",
      "Pyth-native execution path",
    ],
  },
  evm: {
    chain: "evm",
    appRoot: fromRoot("apps", "blockchain", "evm"),
    adapterPackage: "@anaconda/evm",
    currentSourceOfTruth: [
      fromRoot("packages", "evm", "src", "index.ts"),
      fromRoot("packages", "evm", "src", "fixtures.ts"),
    ],
    nextArtifacts: [
      "Safe-aware treasury connector",
      "Uniswap route adapter",
      "Pyth EVM verification path",
    ],
  },
};

export const collaborationGuide = {
  entrypoint: fromRoot("apps", "blockchain"),
  rule:
    "New chain-facing work should start in apps/blockchain/* so the team has one obvious collaboration surface. Shared primitives stay in packages/* until a breaking migration is planned.",
};
