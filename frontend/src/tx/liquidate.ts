import {
  BlockfrostProvider,
  MeshTxBuilder,
  applyParamsToScript,
  serializePlutusScript,
  resolvePlutusScriptHash,
  serializeRewardAddress,
  mConStr0,
  mConStr2,
  type UTxO,
  type BrowserWallet,
} from "@meshsdk/core";
import { addVKeyWitnessSetToTransaction } from "@meshsdk/core-cst";

import {
  UNPARAMETERISED_SCRIPT_CBOR,
  PARAMS,
  PYTH,
  computeBurnReturn,
} from "./contract";

// ── Derive parameterised script once ─────────────────────────────────────────

function getScript() {
  const scriptCbor = applyParamsToScript(UNPARAMETERISED_SCRIPT_CBOR, [
    PARAMS.PYTH_POLICY_ID,
    PARAMS.ADA_USD_FEED_ID,
    PARAMS.COLLATERAL_RATIO,
    PARAMS.LIQUIDATION_THRESHOLD,
  ]);

  const script = { code: scriptCbor, version: "V3" as const };
  const poolAddress = serializePlutusScript(script, undefined, 0).address;
  const scriptHash = resolvePlutusScriptHash(poolAddress);

  return { scriptCbor, scriptHash, poolAddress };
}

// ── buildLiquidateTx ──────────────────────────────────────────────────────────

/**
 * Build, sign, and submit a Liquidate transaction.
 *
 * Anyone can call this when the position's health ratio drops below
 * liquidation_threshold. No owner signature required.
 *
 * @param wallet         Connected CIP-30 browser wallet (MeshSDK BrowserWallet)
 * @param synthToBurn    Synth token amount to burn (in micro-USD, 6 decimals)
 * @param pythHex        Signed Pyth price message (solanaPayload from backend)
 * @param adaUsdPrice    Current ADA/USD price as a float (e.g. 0.70)
 * @param blockfrostKey  Blockfrost preprod project ID
 * @returns              Submitted transaction hash
 */
export async function buildLiquidateTx(
  wallet: BrowserWallet,
  synthToBurn: bigint,
  pythHex: string,
  adaUsdPrice: number,
  blockfrostKey: string
): Promise<string> {
  const provider = new BlockfrostProvider(blockfrostKey);
  const { scriptCbor, scriptHash, poolAddress } = getScript();

  // Bounded validity range required by the Pyth verify script.
  const latestBlockResp = await fetch(
    "https://cardano-preprod.blockfrost.io/api/v0/blocks/latest",
    { headers: { project_id: blockfrostKey } }
  );
  const latestBlock = await latestBlockResp.json();
  const currentSlot: number = latestBlock.slot;

  // ── 1. Fetch UTxOs ────────────────────────────────────────────────────────

  const poolUtxos: UTxO[] = await provider.fetchAddressUTxOs(poolAddress);
  if (poolUtxos.length === 0) throw new Error("Pool UTxO not found");
  const poolUtxo = poolUtxos[0];

  const pythStateUnit = PARAMS.PYTH_POLICY_ID + PYTH.STATE_ASSET_NAME;
  const pythUtxos: UTxO[] = await provider.fetchAddressUTxOs(PYTH.STATE_ADDRESS, pythStateUnit);
  if (pythUtxos.length === 0) throw new Error("Pyth State NFT UTxO not found");
  const stateUtxo = pythUtxos[0];

  const withdrawScriptHash = PYTH.WITHDRAW_SCRIPT_HASH;
  const withdrawAddress = serializeRewardAddress(withdrawScriptHash, true, 0);

  const allPythUtxos: UTxO[] = await provider.fetchAddressUTxOs(PYTH.STATE_ADDRESS);
  const withdrawRefUtxo = allPythUtxos.find(
    (u) => u.output.scriptHash === withdrawScriptHash
  );
  if (!withdrawRefUtxo) throw new Error("Pyth withdraw reference script UTxO not found");

  const walletAddress = await (wallet as any).getChangeAddressBech32();
  const walletUtxos: UTxO[] = await provider.fetchAddressUTxOs(walletAddress);

  const collateralRaw: string[] = (await wallet.getCollateral()) as unknown as string[];
  if (collateralRaw.length === 0)
    throw new Error("No collateral set in wallet. Enable collateral in your wallet settings.");
  const colTxHash = collateralRaw[0].slice(8, 72);
  const colOiByte = parseInt(collateralRaw[0].slice(72, 74), 16);
  const colIndex = colOiByte <= 23 ? colOiByte : parseInt(collateralRaw[0].slice(74, 76), 16);
  const col: UTxO = {
    input: { txHash: colTxHash, outputIndex: colIndex },
    output: { address: walletAddress, amount: [{ unit: "lovelace", quantity: "5000000" }] },
  };

  // ── 2. Compute amounts ────────────────────────────────────────────────────

  const adaToReturn = computeBurnReturn(synthToBurn, adaUsdPrice);
  if (adaToReturn <= 0n) throw new Error("ADA return amount too small");

  const currentPoolLovelace = BigInt(
    poolUtxo.output.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0"
  );
  if (adaToReturn > currentPoolLovelace)
    throw new Error("Insufficient ADA in pool for this liquidation amount");

  const newPoolLovelace = currentPoolLovelace - adaToReturn;

  // ── 3. Build datums and redeemers ─────────────────────────────────────────

  // Parse owner PKH from CBOR inline datum (same format as burn.ts).
  const plutusCbor = poolUtxo.output.plutusData as string;
  const CONSTR0_PREFIX = "d8799f581c";
  const existingOwnerPkh: string = plutusCbor?.startsWith(CONSTR0_PREFIX)
    ? plutusCbor.slice(CONSTR0_PREFIX.length, CONSTR0_PREFIX.length + 56)
    : "";
  if (!existingOwnerPkh) throw new Error("Could not read owner from pool datum");

  const poolDatum = mConStr0([existingOwnerPkh]);

  // Action.Liquidate — Constr(2, [])
  const liquidateRedeemer = mConStr2([]);

  // Pyth withdraw redeemer — List<ByteArray> with the signed price message.
  const pythRedeemer = [pythHex];

  // ── 4. Build transaction ──────────────────────────────────────────────────

  const exSpend    = { mem: 2_000_000, steps: 1_000_000_000 };
  const exMint     = { mem: 4_000_000, steps: 2_000_000_000 };
  const exWithdraw = { mem: 8_000_000, steps: 5_000_000_000 };

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  await txBuilder
    .spendingPlutusScriptV3()
    .txIn(
      poolUtxo.input.txHash,
      poolUtxo.input.outputIndex,
      poolUtxo.output.amount,
      poolUtxo.output.address
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(liquidateRedeemer, "Mesh", exSpend)
    .txInScript(scriptCbor)

    .txOut(poolAddress, [{ unit: "lovelace", quantity: newPoolLovelace.toString() }])
    .txOutInlineDatumValue(poolDatum, "Mesh")

    .mintPlutusScriptV3()
    .mint((-synthToBurn).toString(), scriptHash, "")
    .mintingScript(scriptCbor)
    .mintRedeemerValue(liquidateRedeemer, "Mesh", exMint)

    .readOnlyTxInReference(stateUtxo.input.txHash, stateUtxo.input.outputIndex)

    .withdrawalPlutusScriptV3()
    .withdrawal(withdrawAddress, "0")
    .withdrawalTxInReference(
      withdrawRefUtxo.input.txHash,
      withdrawRefUtxo.input.outputIndex,
      String(withdrawRefUtxo.output.scriptRef?.length ? withdrawRefUtxo.output.scriptRef.length / 2 : 0),
      withdrawScriptHash
    )
    .withdrawalRedeemerValue(pythRedeemer, "Mesh", exWithdraw)

    .txInCollateral(
      col.input.txHash,
      col.input.outputIndex,
      col.output.amount,
      col.output.address
    )
    .changeAddress(walletAddress)
    .selectUtxosFrom(walletUtxos)
    // No requiredSignerHash — liquidation is permissionless.
    .invalidBefore(currentSlot - 60)
    .invalidHereafter(currentSlot + 600)
    .complete();

  const unsignedTx = txBuilder.txHex;
  const witnessSet = await wallet.signTx(unsignedTx);
  const signedTx = addVKeyWitnessSetToTransaction(unsignedTx, witnessSet);
  return provider.submitTx(signedTx);
}
