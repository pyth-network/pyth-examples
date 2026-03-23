import { describe, it, expect } from "vitest";
import { Emulator, generateEmulatorAccount } from "@lucid-evolution/provider";
import {
  Lucid,
  paymentCredentialOf,
  credentialToRewardAddress,
  credentialToAddress,
  validatorToScriptHash,
  Data,
  Constr,
  fromText,
  stakeCredentialOf,
} from "@lucid-evolution/lucid";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildValidator, getScriptAddress } from "../validator.js";
import { buildLockTx } from "../transactions/lock.js";
import { buildUnlockTxFromData, computeLovelaceForUser } from "../transactions/unlock.js";
import type { Config } from "../config.js";
import type { PythContext } from "../pyth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const blueprintPath = resolve(__dirname, "../../plutus.json");

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    blockfrostProjectId: "test",
    sponsorSeedPhrase: "",
    pythPolicyId: "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003",
    pythLazerToken: "test",
    network: "Preprod",
    blockfrostUrl: "",
    ...overrides,
  };
}

// Hardcoded Pyth price bytes from Aiken tests
// ADA/USD price=75000000, exponent=-8 => $0.75/ADA
const PYTH_UPDATE_075 =
  "b9011a820000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f0075d3c7930010a5d4e80000000301100000000200c06878040000000004f8ff";

// -- Unit tests --

describe("computeLovelaceForUser", () => {
  it("at $0.75/ADA, 1000 cents ($10) → 13_333_334 lovelace (ceiling)", () => {
    // price = 75000000 * 10^-8 = 0.75
    // numerator=75000000, denominator=100000000
    expect(computeLovelaceForUser(1000n, 75000000n, 100000000n)).toBe(13_333_334n);
  });

  it("at $0.75/ADA, 13_333_333 is NOT enough (ceiling enforced)", () => {
    expect(computeLovelaceForUser(1000n, 75000000n, 100000000n)).toBeGreaterThan(13_333_333n);
  });

  it("at $0.50/ADA, 1000 cents ($10) → 20_000_000 lovelace", () => {
    // price = 50000000 * 10^-8 = 0.50
    expect(computeLovelaceForUser(1000n, 50000000n, 100000000n)).toBe(20_000_000n);
  });

  it("exact division (no rounding needed)", () => {
    // 2000 cents at $1.00/ADA = 20_000_000 lovelace
    // numerator=1, denominator=1
    expect(computeLovelaceForUser(2000n, 1n, 1n)).toBe(20_000_000n);
  });
});