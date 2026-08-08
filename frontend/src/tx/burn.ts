import {
  BlockfrostProvider,
  MeshTxBuilder,
  applyParamsToScript,
  serializePlutusScript,
  resolvePlutusScriptHash,
  serializeRewardAddress,
  deserializeAddress,
  mConStr0,
  mConStr1,
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

// ── buildBurnTx ───────────────────────────────────────────────────────────────

/**
 * Build, sign, and submit a Burn transaction.
 *
 * @param wallet         Connected CIP-30 browser wallet (MeshSDK BrowserWallet)
 * @param synthToBurn    Synth token amount to burn (in micro-USD, 6 decimals)
 * @param pythHex        Signed Pyth price message (solanaPayload from backend)
 * @param adaUsdPrice    Current ADA/USD price as a float (e.g. 0.70)
 * @param blockfrostKey  Blockfrost preprod project ID
 * @returns              Submitted transaction hash
 */
export async function buildBurnTx(
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

  // Pool UTxO — the single UTxO locked at the script address.
  const poolUtxos: UTxO[] = await provider.fetchAddressUTxOs(poolAddress);
  if (poolUtxos.length === 0) throw new Error("Pool UTxO not found");
  const poolUtxo = poolUtxos[0];

  // Pyth State NFT UTxO — reference input carrying the oracle state.
  const pythStateUnit = PARAMS.PYTH_POLICY_ID + PYTH.STATE_ASSET_NAME;
  const pythUtxos: UTxO[] = await provider.fetchAddressUTxOs(PYTH.STATE_ADDRESS, pythStateUnit);
  if (pythUtxos.length === 0) throw new Error("Pyth State NFT UTxO not found");
  const stateUtxo = pythUtxos[0];

  // Use the hardcoded withdraw script hash (same approach as mint.ts).
  // getPythScriptHash() fails because Blockfrost returns the datum in a format
  // the function doesn't recognise.
  const withdrawScriptHash = PYTH.WITHDRAW_SCRIPT_HASH;
  const withdrawAddress = serializeRewardAddress(withdrawScriptHash, true, 0);

  // Find the UTxO at the Pyth State address that has the withdraw script published as a reference script.
  const allPythUtxos: UTxO[] = await provider.fetchAddressUTxOs(PYTH.STATE_ADDRESS);
  const withdrawRefUtxo = allPythUtxos.find(
    (u) => u.output.scriptHash === withdrawScriptHash
  );
  if (!withdrawRefUtxo) throw new Error("Pyth withdraw reference script UTxO not found");

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

  const adaToReturn = computeBurnReturn(synthToBurn, adaUsdPrice);
  console.log("[buildBurnTx] synthToBurn:", synthToBurn.toString(), "adaUsdPrice:", adaUsdPrice, "adaToReturn:", adaToReturn.toString());
  if (adaToReturn <= 0n) throw new Error("ADA return amount too small");

  const currentPoolLovelace = BigInt(
    poolUtxo.output.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0"
  );
  console.log("[buildBurnTx] currentPoolLovelace:", currentPoolLovelace.toString());
  if (adaToReturn > currentPoolLovelace) {
    const rawPrice = BigInt(Math.round(adaUsdPrice * 1e8));
    const maxBurnable = (currentPoolLovelace * rawPrice) / 100_000_000n;
    throw new Error(
      `Insufficient ADA in pool. Max burnable synth at current price: ${maxBurnable} micro-synth (${Number(maxBurnable) / 1e6} synth). ` +
      `You may have old tokens from a previous contract deployment — burn only what you minted in this session.`
    );
  }

  const newPoolLovelace = currentPoolLovelace - adaToReturn;

  // ── 3. Build datums and redeemers ─────────────────────────────────────────

  // Read owner PKH from the pool datum — this is what the validator checks.
  // PoolDatum is Constr(0, [owner_pkh_hex]).
  // Blockfrost decodes inline datums as { constructor: N, fields: [{ bytes: "..." }] }
  // so we need .fields[0].bytes, not .fields[0] directly.
  // plutusData from Blockfrost is raw CBOR hex, e.g.:
  //   d8799f581c<28-byte-pkh>ff
  //   d879 = tag 121 (Constr 0), 9f = indef array, 581c = 28-byte bytestring
  // Extract the 28-byte (56 hex char) PKH directly from the CBOR string.
  const plutusCbor = poolUtxo.output.plutusData as string;
  const CONSTR0_PREFIX = "d8799f581c"; // Constr(0,[ByteArray(28)])
  const datumOwnerPkh: string = plutusCbor?.startsWith(CONSTR0_PREFIX)
    ? plutusCbor.slice(CONSTR0_PREFIX.length, CONSTR0_PREFIX.length + 56)
    : "";
  if (!datumOwnerPkh) throw new Error("Could not read owner from pool datum");

  // Fail fast if the connected wallet is not the position owner.
  const walletPkh = deserializeAddress(walletAddress).pubKeyHash;
  if (walletPkh !== datumOwnerPkh)
    throw new Error("Connected wallet is not the position owner");

  // Preserve the existing datum owner when writing back (owner never changes).
  const poolDatum = mConStr0([datumOwnerPkh]);

  // Action.Burn — Constr(1, [])
  const burnRedeemer = mConStr1([]);

  // Pyth withdraw redeemer — List<ByteArray> with the signed price message.
  const pythRedeemer = [pythHex];


  // ── 4. Build transaction ──────────────────────────────────────────────────

  const exSpend    = { mem: 2_000_000, steps: 1_000_000_000 };
  const exMint     = { mem: 4_000_000, steps: 2_000_000_000 };
  const exWithdraw = { mem: 8_000_000, steps: 5_000_000_000 };

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  await txBuilder
    // Spend the pool UTxO (spend validator delegates to mint validator).
    .spendingPlutusScriptV3()
    .txIn(
      poolUtxo.input.txHash,
      poolUtxo.input.outputIndex,
      poolUtxo.output.amount,
      poolUtxo.output.address
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(burnRedeemer, "Mesh", exSpend)
    .txInScript(scriptCbor)

    // Return pool UTxO with decreased ADA + same datum.
    .txOut(poolAddress, [{ unit: "lovelace", quantity: newPoolLovelace.toString() }])
    .txOutInlineDatumValue(poolDatum, "Mesh")

    // Burn synth tokens (negative mint amount).
    .mintPlutusScriptV3()
    .mint((-synthToBurn).toString(), scriptHash, "")
    .mintingScript(scriptCbor)
    .mintRedeemerValue(burnRedeemer, "Mesh", exMint)

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
    .requiredSignerHash(datumOwnerPkh) // Burn requires owner signature (on-chain check)
    .invalidBefore(currentSlot - 60)
    .invalidHereafter(currentSlot + 600)
    .complete();

  const unsignedTx = txBuilder.txHex;
  const witnessSet = await wallet.signTx(unsignedTx);
  const signedTx = addVKeyWitnessSetToTransaction(unsignedTx, witnessSet);
  return provider.submitTx(signedTx);
}
