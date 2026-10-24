import {
  MeshTxBuilder,
  IWallet,
  UTxO,
  deserializeAddress,
} from "@meshsdk/core";
import { getProvider } from "./provider";
import {
  SCRIPT_ADDRESS,
  COMPILED_SCRIPT,
  buildIronPigDatum,
  REDEEMER_DEPOSIT,
  REDEEMER_WITHDRAW,
  LOVELACE_PER_ADA,
} from "./contract";
import {
  PYTH_STATE_TX_HASH,
  PYTH_STATE_TX_INDEX,
  PYTH_SCRIPT_REF_TX_HASH,
  PYTH_SCRIPT_REF_TX_INDEX,
  PYTH_WITHDRAW_SCRIPT_HASH,
  pythRewardAddress,
  buildPythRedeemer,
  validatePythWithdrawConfig,
} from "./pyth";

function getRequiredCollateralUtxo(collateral: UTxO[]): UTxO {
  const collateralUtxo = collateral[0];
  if (!collateralUtxo) {
    throw new Error(
      "No collateral UTxO found in wallet. Set collateral in your wallet and try again.",
    );
  }
  return collateralUtxo;
}

async function signTxWithFallback(wallet: IWallet, unsignedTx: string): Promise<string> {
  try {
    return await wallet.signTx(unsignedTx, true);
  } catch {
    return await wallet.signTx(unsignedTx);
  }
}

async function getReferenceScriptSize(
  provider: ReturnType<typeof getProvider>,
  txHash: string,
  txIndex: number,
): Promise<string> {
  const utxos = await provider.fetchUTxOs(txHash, txIndex);
  const ref = utxos.find((utxo) => utxo.input.outputIndex === txIndex);
  const scriptRef = ref?.output.scriptRef;
  if (!scriptRef) {
    throw new Error(
      `Missing reference script bytes at ${txHash}#${txIndex}. Check Pyth script-ref env values.`,
    );
  }
  return (scriptRef.length / 2).toString();
}

// ---------------------------------------------------------------------------
// 1. CREATE VAULT — pay ADA to script with inline IronPigDatum
// ---------------------------------------------------------------------------
export async function createVault(
  wallet: IWallet,
  goalUsd: number,
  adaAmount: number,
): Promise<string> {
  const provider = getProvider();
  const addresses = await wallet.getUsedAddresses();
  const changeAddress = addresses[0];
  const utxos = await wallet.getUtxos();

  const { pubKeyHash: ownerVkh } = deserializeAddress(changeAddress);
  const datum = buildIronPigDatum(goalUsd, ownerVkh);
  const lovelace = (adaAmount * LOVELACE_PER_ADA).toString();

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .txOut(SCRIPT_ADDRESS, [{ unit: "lovelace", quantity: lovelace }])
    .txOutInlineDatumValue(datum)
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await signTxWithFallback(wallet, unsignedTx);
  return wallet.submitTx(signedTx);
}

// ---------------------------------------------------------------------------
// 2. DEPOSIT — spend existing vault UTxO and re-lock with more ADA / tokens
// ---------------------------------------------------------------------------
export async function deposit(
  wallet: IWallet,
  vaultUtxo: UTxO,
  existingDatum: { alternative: number; fields: unknown[] },
  addLovelace: number,
  addUsdcx: number,
): Promise<string> {
  const provider = getProvider();
  const addresses = await wallet.getUsedAddresses();
  const changeAddress = addresses[0];
  const utxos = await wallet.getUtxos();
  const collateral = await wallet.getCollateral();
  const collateralUtxo = getRequiredCollateralUtxo(collateral);

  const currentLovelace = parseInt(
    vaultUtxo.output.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0",
  );
  const newLovelace = (currentLovelace + addLovelace).toString();
  const newOutput: { unit: string; quantity: string }[] = [
    { unit: "lovelace", quantity: newLovelace },
  ];

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(
      vaultUtxo.input.txHash,
      vaultUtxo.input.outputIndex,
      vaultUtxo.output.amount,
      SCRIPT_ADDRESS,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(REDEEMER_DEPOSIT, "Mesh", { mem: 3_500_000, steps: 1_000_000_000 })
    .txInScript(COMPILED_SCRIPT)
    .txOut(SCRIPT_ADDRESS, newOutput)
    .txOutInlineDatumValue(existingDatum)
    .changeAddress(changeAddress)
    .txInCollateral(
      collateralUtxo.input.txHash,
      collateralUtxo.input.outputIndex,
    )
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await signTxWithFallback(wallet, unsignedTx);
  return wallet.submitTx(signedTx);
}

// ---------------------------------------------------------------------------
// 3. WITHDRAW — Pyth Lazer verified price + vault spend in a single tx.
//
//    Shape:
//      - Spend vault UTxO with Withdraw redeemer
//      - Read-only ref input: Pyth State NFT
//      - 0-withdrawal from Pyth withdraw script with [signedUpdate] redeemer
//      - Short validity window aligned with oracle freshness
// ---------------------------------------------------------------------------
export async function withdraw(
  wallet: IWallet,
  vaultUtxo: UTxO,
  existingDatum: { alternative: number; fields: unknown[] },
  signedUpdateHex: string,
): Promise<string> {
  const missingConfig = validatePythWithdrawConfig();
  if (missingConfig.length > 0) {
    throw new Error(
      `Pyth withdraw config missing/invalid in .env: ${missingConfig.join(", ")}`,
    );
  }

  const provider = getProvider();
  const addresses = await wallet.getUsedAddresses();
  const changeAddress = addresses[0];
  const utxos = await wallet.getUtxos();
  const collateral = await wallet.getCollateral();
  const collateralUtxo = getRequiredCollateralUtxo(collateral);

  const pythReward = pythRewardAddress(0);
  const pythRedeemer = buildPythRedeemer(signedUpdateHex);
  const pythRefScriptSize = await getReferenceScriptSize(
    provider,
    PYTH_SCRIPT_REF_TX_HASH,
    PYTH_SCRIPT_REF_TX_INDEX,
  );

  const nowMs = Date.now();
  const slotOffset = 4_924_800;
  const nowSlot = Math.floor((nowMs / 1000) - 1_596_491_091) + slotOffset;

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  txBuilder
    .spendingPlutusScriptV3()
    .txIn(
      vaultUtxo.input.txHash,
      vaultUtxo.input.outputIndex,
      vaultUtxo.output.amount,
      SCRIPT_ADDRESS,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(REDEEMER_WITHDRAW, "Mesh", { mem: 14_000_000, steps: 5_000_000_000 })
    .txInScript(COMPILED_SCRIPT);

  const sameRefUtxo =
    PYTH_STATE_TX_HASH === PYTH_SCRIPT_REF_TX_HASH &&
    PYTH_STATE_TX_INDEX === PYTH_SCRIPT_REF_TX_INDEX;
  if (!sameRefUtxo) {
    txBuilder.readOnlyTxInReference(PYTH_STATE_TX_HASH, PYTH_STATE_TX_INDEX);
  }

  const unsignedTx = await txBuilder
    .withdrawalPlutusScriptV3()
    .withdrawal(pythReward, "0")
    .withdrawalTxInReference(
      PYTH_SCRIPT_REF_TX_HASH,
      PYTH_SCRIPT_REF_TX_INDEX,
      pythRefScriptSize,
      PYTH_WITHDRAW_SCRIPT_HASH,
    )
    .withdrawalRedeemerValue(pythRedeemer, "Mesh", { mem: 14_000_000, steps: 10_000_000_000 })
    .txOut(changeAddress, vaultUtxo.output.amount)
    .invalidBefore(nowSlot - 60)
    .invalidHereafter(nowSlot + 60)
    .changeAddress(changeAddress)
    .txInCollateral(
      collateralUtxo.input.txHash,
      collateralUtxo.input.outputIndex,
    )
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await signTxWithFallback(wallet, unsignedTx);
  return wallet.submitTx(signedTx);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function lovelaceToAda(lovelace: number): number {
  return lovelace / LOVELACE_PER_ADA;
}
