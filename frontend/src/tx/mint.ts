import {
  BlockfrostProvider,
  MeshTxBuilder,
  applyParamsToScript,
  serializePlutusScript,
  resolvePlutusScriptHash,
  serializeRewardAddress,
  deserializeAddress,
  mConStr0,
  type UTxO,
  type BrowserWallet,
} from "@meshsdk/core";
import { addVKeyWitnessSetToTransaction } from "@meshsdk/core-cst";
import {
  UNPARAMETERISED_SCRIPT_CBOR,
  PARAMS,
  PYTH,
  computeMintAmount,
} from "./contract";

// ── Derive parameterised script once ─────────────────────────────────────────

function getScript() {
  // Apply the four compile-time parameters to get the final script CBOR.
  // Order must match the validator signature:
  //   synth_dolar(pyth_policy_id, ada_usd_feed_id, collateral_ratio, liquidation_threshold)
  const scriptCbor = applyParamsToScript(UNPARAMETERISED_SCRIPT_CBOR, [
    PARAMS.PYTH_POLICY_ID,
    PARAMS.ADA_USD_FEED_ID,
    PARAMS.COLLATERAL_RATIO,
    PARAMS.LIQUIDATION_THRESHOLD,
  ]);

  console.log("[getScript] scriptCbor:", scriptCbor);
  const script = { code: scriptCbor, version: "V3" as const };

  // Bech32 script address on preprod (network id = 0).
  const poolAddress = serializePlutusScript(script, undefined, 0).address;
  console.log("[getScript] poolAddress:", poolAddress);

  // The policy ID is the Blake2b-224 hash of the parameterised script.
  const scriptHash = resolvePlutusScriptHash(poolAddress);
  console.log("[getScript] scriptHash (policyId):", scriptHash);

  return { scriptCbor, scriptHash, poolAddress };
}

// ── buildMintTx ───────────────────────────────────────────────────────────────

/**
 * Build, sign, and submit a Mint transaction.
 *
 * @param wallet         Connected CIP-30 browser wallet (MeshSDK BrowserWallet)
 * @param adaToDeposit   ADA amount the user wants to deposit (in lovelaces)
 * @param pythHex        Signed Pyth price message (solanaPayload from backend)
 * @param adaUsdPrice    Current ADA/USD price as a float (e.g. 0.70)
 * @param blockfrostKey  Blockfrost preprod project ID
 * @returns              Submitted transaction hash
 */
export async function buildMintTx(
  wallet: BrowserWallet,
  adaToDeposit: bigint,
  pythHex: string,
  adaUsdPrice: number,
  blockfrostKey: string,
  assetNameHex: string = ""
): Promise<string> {
  const provider = new BlockfrostProvider(blockfrostKey);
  const { scriptCbor, scriptHash, poolAddress } = getScript();
  console.log("api key de blockfrost mint.ts",blockfrostKey);

  // Fetch the current slot so we can set a bounded validity range.
  // The Pyth verify script checks: tx.validity_range ⊆ trusted_key.valid_range.
  // A tx without invalidBefore/invalidHereafter has validity (-∞,+∞) which is
  // never ⊆ a finite key range → is_trusted always fails without this.
  const latestBlockResp = await fetch(
    "https://cardano-preprod.blockfrost.io/api/v0/blocks/latest",
    { headers: { project_id: blockfrostKey } }
  );
  const latestBlock = await latestBlockResp.json();
  const currentSlot: number = latestBlock.slot;

  // ── 1. Fetch UTxOs ────────────────────────────────────────────────────────

  // Pool UTxO — the single UTxO locked at the script address.
  // May not exist on the very first mint (Blockfrost returns 404 for unused addresses).
  const poolUtxos: UTxO[] = await provider.fetchAddressUTxOs(poolAddress).catch(() => []);
  const poolUtxo: UTxO | undefined = poolUtxos[0];

  // Pyth State NFT UTxO — reference input carrying the oracle state.
  // The UTxO changes on every oracle update, so we query by address + asset unit.
  const pythStateUnit = PARAMS.PYTH_POLICY_ID + PYTH.STATE_ASSET_NAME;
  const pythUtxos: UTxO[] = await provider.fetchAddressUTxOs(PYTH.STATE_ADDRESS, pythStateUnit);
    console.log("address de pyth",PYTH.STATE_ADDRESS);
  if (pythUtxos.length === 0) throw new Error("Pyth State NFT UTxO not found");
  console.log("utxos de pyth",pythUtxos);
  const stateUtxo = pythUtxos[0];

  // Compute withdraw address from hardcoded script hash using MeshSDK's own
  // serializer (avoids relying on a manually-computed bech32 value).
  const withdrawScriptHash = PYTH.WITHDRAW_SCRIPT_HASH;
  const withdrawAddress = serializeRewardAddress(withdrawScriptHash, true, 0);
  console.log("[buildMintTx] withdrawScriptHash:", withdrawScriptHash);
  console.log("[buildMintTx] withdrawAddress:", withdrawAddress);

  // Find the UTxO at the Pyth State address that has the withdraw script
  // published as a reference script. No CBOR needed — we reference it by UTxO.
  const allPythUtxos: UTxO[] = await provider.fetchAddressUTxOs(PYTH.STATE_ADDRESS);
  const withdrawRefUtxo = allPythUtxos.find(
    (u) => u.output.scriptHash === withdrawScriptHash
  );
  if (!withdrawRefUtxo) throw new Error("Pyth withdraw reference script UTxO not found");
  console.log("[buildMintTx] withdrawRefUtxo:", withdrawRefUtxo.input);

  // getChangeAddress() returns raw hex CBOR (CIP-30); use getChangeAddressBech32() for bech32.
  const walletAddress = await (wallet as any).getChangeAddressBech32();

  // wallet.getUtxos() also returns raw CBOR — use Blockfrost to get decoded UTxOs instead.
  const walletUtxos: UTxO[] = await provider.fetchAddressUTxOs(walletAddress);

  // wallet.getCollateral() returns raw CIP-30 CBOR hex strings, not decoded UTxOs.
  // CBOR: 82 82 5820 <32B txHash> <uint outputIndex> 82 5839 <57B address> <uint lovelace>
  const collateralRaw: string[] = (await wallet.getCollateral()) as unknown as string[];
  if (collateralRaw.length === 0)
    throw new Error("No collateral set in wallet. Enable collateral in your wallet settings.");
  const colTxHash = collateralRaw[0].slice(8, 72);
  const colOiByte = parseInt(collateralRaw[0].slice(72, 74), 16);
  const colIndex = colOiByte <= 23 ? colOiByte : parseInt(collateralRaw[0].slice(74, 76), 16);
  // Construct collateral UTxO directly — address is always the user's wallet address.
  const col: UTxO = {
    input: { txHash: colTxHash, outputIndex: colIndex },
    output: { address: walletAddress, amount: [{ unit: "lovelace", quantity: "5000000" }] },
  };

  // ── 2. Compute amounts ────────────────────────────────────────────────────

  const mintAmount = computeMintAmount(adaToDeposit, adaUsdPrice);
  if (mintAmount <= 0n) throw new Error("Mint amount too small");

  const currentPoolLovelace = poolUtxo
    ? BigInt(poolUtxo.output.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0")
    : 0n;
  const newPoolLovelace = currentPoolLovelace + adaToDeposit;

  // ── 3. Build datums and redeemers ─────────────────────────────────────────

  // PoolDatum { owner: ByteArray } — Constr(0, [owner_pkh])
  // In Mesh "Data" format: ByteArray is a plain hex string, Constr is mConStr0.
  const ownerPkh = deserializeAddress(walletAddress).pubKeyHash;
  const poolDatum = mConStr0([ownerPkh]);

  // Action.Mint — Constr(0, [])
  const mintRedeemer = mConStr0([]);

  // Pyth withdraw redeemer — List<ByteArray> with the signed price message.
  // In Mesh "Data" format: List is a plain JS array, ByteArray is a hex string.
  // The backend returns solanaPayload (Solana wire format, magic b9011a82).
  const pythRedeemer = [pythHex];

  // ── 4. Build transaction ──────────────────────────────────────────────────

  // Explicit execution units per redeemer — avoids the 21M default (3×7M > 16.5M protocol limit).
  // Total: 2M + 4M + 8M = 14M mem < 16.5M; 1B + 2B + 5B = 8B steps < 10B.
  const exSpend    = { mem: 2_000_000, steps: 1_000_000_000 };
  const exMint     = { mem: 4_000_000, steps: 2_000_000_000 };
  const exWithdraw = { mem: 8_000_000, steps: 5_000_000_000 };

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  // On the first-ever mint there is no existing pool UTxO to spend.
  // On subsequent mints the old pool UTxO must be spent and recreated.
  if (poolUtxo) {
    txBuilder
      .spendingPlutusScriptV3()
      .txIn(
        poolUtxo.input.txHash,
        poolUtxo.input.outputIndex,
        poolUtxo.output.amount,
        poolUtxo.output.address
      )
      .txInInlineDatumPresent()
      .txInRedeemerValue(mintRedeemer, "Mesh", exSpend)
      .txInScript(scriptCbor);
  }

  await txBuilder
    // Return pool UTxO with increased ADA + updated datum.
    .txOut(poolAddress, [{ unit: "lovelace", quantity: newPoolLovelace.toString() }])
    .txOutInlineDatumValue(poolDatum, "Mesh")

    // Mint synth tokens.
    .mintPlutusScriptV3()
    .mint(mintAmount.toString(), scriptHash, assetNameHex)
    .mintingScript(scriptCbor)
    .mintRedeemerValue(mintRedeemer, "Mesh", exMint)

    // Pyth State NFT as reference input (never spent).
    .readOnlyTxInReference(stateUtxo.input.txHash, stateUtxo.input.outputIndex)

    // Zero-ADA withdrawal from Pyth verify script — carries the signed price message.
    // Address and script hash derived dynamically from the Pyth State datum.
    // Script is referenced by UTxO (no CBOR needed).
    .withdrawalPlutusScriptV3()
    .withdrawal(withdrawAddress, "0")
    .withdrawalTxInReference(
      withdrawRefUtxo.input.txHash,
      withdrawRefUtxo.input.outputIndex,
      String(withdrawRefUtxo.output.scriptRef?.length ? withdrawRefUtxo.output.scriptRef.length / 2 : 0),
      withdrawScriptHash
    )
    .withdrawalRedeemerValue(pythRedeemer, "Mesh", exWithdraw)

    // Collateral + change.
    .txInCollateral(
      col.input.txHash,
      col.input.outputIndex,
      col.output.amount,
      col.output.address
    )
    .changeAddress(walletAddress)
    .selectUtxosFrom(walletUtxos)
    .invalidBefore(currentSlot - 60)
    .invalidHereafter(currentSlot + 600)
    .complete();

  const unsignedTx = txBuilder.txHex;
  // wallet.signTx() returns just the CIP-30 witness set (a1...), not the merged tx.
  // addVKeyWitnessSetToTransaction merges the witness set into the full transaction.
  const witnessSet = await wallet.signTx(unsignedTx);
  const signedTx = addVKeyWitnessSetToTransaction(unsignedTx, witnessSet);
  console.log("[buildMintTx] signedTx first bytes:", signedTx.substring(0, 8));
  return provider.submitTx(signedTx);
}
