import { describe, it, expect } from "vitest";
import {
  Emulator,
  generateEmulatorAccount,
} from "@lucid-evolution/provider";
import { Lucid, paymentCredentialOf } from "@lucid-evolution/lucid";
import { buildValidator, getScriptAddress } from "../validator.js";
import { buildLockTx } from "../transactions/lock.js";
import { buildCancelTx } from "../transactions/cancel.js";
import type { Config } from "../config.js";

// -- Helpers --

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    blockfrostProjectId: "test",
    sponsorSeedPhrase: "",
    pythPolicyId:
      "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003",
    pythLazerToken: "test",
    network: "Preprod",
    blockfrostUrl: "",
    ...overrides,
  };
}

const LOCK_AMOUNT = 30_000_000n; // 30 ADA

describe("lock + cancel flow (emulator)", () => {
  it("locks ADA at the script address", async () => {
    const sponsorAccount = generateEmulatorAccount({
      lovelace: 100_000_000n, // 100 ADA
    });

    const emulator = new Emulator([sponsorAccount]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromAddress(sponsorAccount.address, []);

    const sponsorCred = paymentCredentialOf(sponsorAccount.address);
    // Use a different key for user
    const userAccount = generateEmulatorAccount({ lovelace: 2_000_000n });
    const userCred = paymentCredentialOf(userAccount.address);

    const validator = buildValidator({
      usdAmountCents: 1000n,
      userPaymentKeyHash: userCred.hash,
      sponsorPaymentKeyHash: sponsorCred.hash,
      pythPolicyId: "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003",
    });

    const scriptAddress = getScriptAddress(validator, "Preprod");
    const config = makeConfig();

    // Build and complete the lock tx (just check it builds without error)
    const tx = await buildLockTx(lucid, config, {
      validator,
      lovelaceAmount: LOCK_AMOUNT,
    });

    expect(tx).toBeDefined();
    expect(typeof tx.toCBOR).toBe("function");
  });

  it("cancel tx builds without error when script UTxO is provided", async () => {
    // Accounts
    const sponsorAccount = generateEmulatorAccount({
      lovelace: 100_000_000n,
    });
    const userAccount = generateEmulatorAccount({ lovelace: 2_000_000n });

    const emulator = new Emulator([sponsorAccount, userAccount]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(sponsorAccount.seedPhrase);

    const sponsorCred = paymentCredentialOf(sponsorAccount.address);
    const userCred = paymentCredentialOf(userAccount.address);

    const validator = buildValidator({
      usdAmountCents: 1000n,
      userPaymentKeyHash: userCred.hash,
      sponsorPaymentKeyHash: sponsorCred.hash,
      pythPolicyId: "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003",
    });

    const scriptAddress = getScriptAddress(validator, "Preprod");
    const config = makeConfig();

    // Lock funds first
    const lockTx = await buildLockTx(lucid, config, {
      validator,
      lovelaceAmount: LOCK_AMOUNT,
    });
    const signedLock = await lockTx.sign.withWallet().complete();
    await signedLock.submit();
    emulator.awaitBlock(1);

    // Verify funds are now at the script address
    const scriptUtxos = await lucid.utxosAt(scriptAddress);
    expect(scriptUtxos.length).toBeGreaterThan(0);
    expect(scriptUtxos[0].assets.lovelace).toBe(LOCK_AMOUNT);

    // Build cancel tx
    const cancelTx = await buildCancelTx(lucid, config, {
      validator,
      scriptUtxo: scriptUtxos[0],
    });
    expect(cancelTx).toBeDefined();

    // Sign and submit
    const signedCancel = await cancelTx.sign.withWallet().complete();
    await signedCancel.submit();
    emulator.awaitBlock(1);

    // Script address should now be empty
    const remainingUtxos = await lucid.utxosAt(scriptAddress);
    expect(remainingUtxos.length).toBe(0);
  });

  it("lock creates a UTxO with correct lovelace at the script address", async () => {
    const sponsorAccount = generateEmulatorAccount({
      lovelace: 100_000_000n,
    });
    const userAccount = generateEmulatorAccount({ lovelace: 2_000_000n });

    const emulator = new Emulator([sponsorAccount, userAccount]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(sponsorAccount.seedPhrase);

    const sponsorCred = paymentCredentialOf(sponsorAccount.address);
    const userCred = paymentCredentialOf(userAccount.address);

    const validator = buildValidator({
      usdAmountCents: 500n, // $5.00
      userPaymentKeyHash: userCred.hash,
      sponsorPaymentKeyHash: sponsorCred.hash,
      pythPolicyId: "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003",
    });

    const scriptAddress = getScriptAddress(validator, "Preprod");
    const config = makeConfig();

    const lockTx = await buildLockTx(lucid, config, {
      validator,
      lovelaceAmount: 20_000_000n,
    });
    const signed = await lockTx.sign.withWallet().complete();
    await signed.submit();
    emulator.awaitBlock(1);

    const utxos = await lucid.utxosAt(scriptAddress);
    expect(utxos.length).toBe(1);
    expect(utxos[0].assets.lovelace).toBe(20_000_000n);
  });
});
