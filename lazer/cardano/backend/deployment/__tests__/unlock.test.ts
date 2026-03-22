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

// -- Integration test --

describe("unlock transaction (emulator)", () => {
  it("user receives correct lovelace at $0.75/ADA, sponsor gets remainder", async () => {
    // Accounts
    const sponsorAccount = generateEmulatorAccount({ lovelace: 200_000_000n });
    const userAccount = generateEmulatorAccount({ lovelace: 5_000_000n });

    const emulator = new Emulator([sponsorAccount, userAccount]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(sponsorAccount.seedPhrase);

    const sponsorCred = paymentCredentialOf(sponsorAccount.address);
    const userCred = paymentCredentialOf(userAccount.address);
    const userStakeCred = stakeCredentialOf(userAccount.address);

    const USD_CENTS = 1000n; // $10.00
    const LOCK_AMOUNT = 30_000_000n; // 30 ADA

    const MOCK_PYTH_POLICY_ID = "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003";

    const validator = buildValidator({
      usdAmountCents: USD_CENTS,
      userPaymentKeyHash: userCred.hash,
      userStakeKeyHash: userStakeCred.hash,
      sponsorPaymentKeyHash: sponsorCred.hash,
      pythPolicyId: MOCK_PYTH_POLICY_ID,
    });

    const config = makeConfig({ pythPolicyId: MOCK_PYTH_POLICY_ID, network: "Custom" as any });
    const scriptAddress = getScriptAddress(validator, "Custom" as any);

    // --- Build mock Pyth withdrawal validator ---
    // Load its compiled code from plutus.json
    const blueprint = JSON.parse(readFileSync(blueprintPath, "utf-8")) as {
      validators: Array<{ title: string; compiledCode: string; hash: string }>;
    };
    const mockWithdrawEntry = blueprint.validators.find(
      (v) => v.title === "mock_pyth_withdraw.mock_pyth_withdraw.withdraw",
    );
    if (!mockWithdrawEntry) {
      throw new Error("mock_pyth_withdraw validator not found in plutus.json");
    }

    const mockWithdrawValidator = {
      type: "PlutusV3" as const,
      script: mockWithdrawEntry.compiledCode,
    };
    const mockWithdrawScriptHash = validatorToScriptHash(mockWithdrawValidator);
    const mockRewardAddress = credentialToRewardAddress("Custom", {
      type: "Script",
      hash: mockWithdrawScriptHash,
    });

    // Build a valid "Custom" network address to hold the Pyth State UTxO
    // We use the mock withdraw script hash as the payment credential for the state address
    const pythStateAddress = credentialToAddress("Custom", {
      type: "Script",
      hash: mockWithdrawScriptHash,
    });

    // --- Build mock Pyth State datum ---
    // Pyth { governance: Governance {...}, trusted_signers: [], deprecated_withdraw_scripts: [], withdraw_script: hash }
    // Note: trusted_signers and deprecated_withdraw_scripts are Pairs<k,v> in Aiken,
    // which maps to Map (CBOR map `a0`) in Plutus Data, not a list.
    const mockPythDatum = Data.to(
      new Constr(0, [
        new Constr(0, ["0".repeat(56), 0n, "", 0n]), // governance
        new Map(), // trusted_signers (Pairs<VerificationKey, ValidityRange>)
        new Map(), // deprecated_withdraw_scripts (Pairs<ValidityRange, ScriptHash>)
        mockWithdrawScriptHash, // withdraw_script (28-byte hash)
      ]),
    );

    // --- Inject Pyth State UTxO into emulator ledger ---
    const PYTH_STATE_ASSET = fromText("Pyth State");
    const pythStateUnit = MOCK_PYTH_POLICY_ID + PYTH_STATE_ASSET;
    const pythStateTxHash = "0".repeat(63) + "1";

    emulator.ledger[pythStateTxHash + "0"] = {
      utxo: {
        txHash: pythStateTxHash,
        outputIndex: 0,
        address: pythStateAddress,
        assets: { lovelace: 2_000_000n, [pythStateUnit]: 1n },
        datum: mockPythDatum,
        scriptRef: undefined,
      },
      spent: false,
    };

    // --- Register the mock withdrawal stake credential ---
    const registerTx = await lucid.newTx().registerStake(mockRewardAddress).complete();
    await (await registerTx.sign.withWallet().complete()).submit();
    emulator.awaitBlock(1);

    // --- Lock funds ---
    const lockTx = await buildLockTx(lucid, config, {
      validator,
      lovelaceAmount: LOCK_AMOUNT,
    });
    await (await lockTx.sign.withWallet().complete()).submit();
    emulator.awaitBlock(1);

    // Advance the emulator clock so that Date.now() - 60s is a valid slot.
    // validFrom uses currentTime - 60_000ms; we need currentTime - 60_000 >= emulator zeroTime.
    // Each awaitBlock(1) advances 20s. Advance 4 more blocks (80s) to ensure at least 60s margin.
    emulator.awaitBlock(4);

    // Verify locked
    const scriptUtxos = await lucid.utxosAt(scriptAddress);
    expect(scriptUtxos.length).toBe(1);
    expect(scriptUtxos[0].assets.lovelace).toBe(LOCK_AMOUNT);

    // --- Build Pyth context for unlock ---
    const pythCtx: PythContext = {
      stateUtxo: {
        txHash: pythStateTxHash,
        outputIndex: 0,
        address: pythStateAddress,
        assets: { lovelace: 2_000_000n, [pythStateUnit]: 1n },
        datum: mockPythDatum,
        scriptRef: undefined,
      },
      withdrawScriptHash: mockWithdrawScriptHash,
      withdrawValidator: mockWithdrawValidator,
      rewardAddress: mockRewardAddress,
    };

    // --- Unlock with $0.75/ADA price ---
    // At $0.75/ADA, $10 = 13_333_334 lovelace
    const expectedUserLovelace = 13_333_334n;

    // Pass emulator.now() so the validity range aligns with the emulator's clock
    const unlockTx = await buildUnlockTxFromData(
      lucid,
      config,
      {
        validator,
        usdAmountCents: USD_CENTS,
        userAddress: userAccount.address,
        sponsorAddress: sponsorAccount.address,
        scriptUtxo: scriptUtxos[0],
      },
      pythCtx,
      PYTH_UPDATE_075,
      emulator.now(),
    );

    await (await unlockTx.sign.withWallet().complete()).submit();
    emulator.awaitBlock(1);

    // --- Verify balances ---
    const scriptUtxosAfter = await lucid.utxosAt(scriptAddress);
    expect(scriptUtxosAfter.length).toBe(0);

    // Check user received expected lovelace
    const userUtxos = await lucid.utxosAt(userAccount.address);
    const userLovelace = userUtxos.reduce((sum, u) => sum + (u.assets.lovelace ?? 0n), 0n);
    // User started with 5 ADA + should have received 13_333_334 lovelace
    expect(userLovelace).toBeGreaterThanOrEqual(expectedUserLovelace);

    // Check sponsor received remainder
    const sponsorUtxos = await lucid.utxosAt(sponsorAccount.address);
    const sponsorLovelace = sponsorUtxos.reduce((sum, u) => sum + (u.assets.lovelace ?? 0n), 0n);
    expect(sponsorLovelace).toBeGreaterThan(0n);
  });
});
