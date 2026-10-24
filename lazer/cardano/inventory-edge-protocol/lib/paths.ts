import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Repo root: inventory-edge-protocol/ */
export const PROJECT_ROOT = join(here, "..");

export const ONCHAIN_DIR = join(PROJECT_ROOT, "onchain");

export const PLUTUS_JSON = join(ONCHAIN_DIR, "plutus.json");
