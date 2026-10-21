import {
  Core, Blaze, Blockfrost, HotWallet,
  constr, bytes, integer, mkMarketDatum, submitTx, makeEvaluator, deriveScript, getSlotConfig,
  PYTH_POLICY_ID, NETWORK, MINT_TOKENS, BURN_TOKENS, RESOLVE, TRUE, FALSE, NONE,
} from "./cardano.ts";
import { getPythUpdate, FEED_NAME_TO_ID } from "./pyth.ts";
import type { MarketState } from "./types.ts";

// ── Derive + find market UTxO ────────────────────────────────────────────

export async function deriveMarket(provider: Blockfrost, policyIdHex: string, oneShotTxHash: string, oneShotIdx: number) {
  const { marketScript, policyId, scriptAddr } = deriveScript(oneShotTxHash, oneShotIdx);

  const utxos = await provider.getUnspentOutputs(scriptAddr);
  const stateThreadAssetId = Core.AssetId.fromParts(policyId, Core.AssetName(""));
  const marketUtxo = utxos.find((u: Core.TransactionUnspentOutput) => {
    const ma = u.output().amount().multiasset();
    if (!ma) return false;
    return (ma.get(stateThreadAssetId) ?? 0n) === 1n;
  });
  if (!marketUtxo) throw new Error("Market UTxO not found at script address");

  const datumData = marketUtxo.output().datum()!.asInlineData()!;
  const df = datumData.asConstrPlutusData()!.getData();

  return { marketScript, policyId, scriptAddr, marketUtxo, df };
}

// ── Parse datum to MarketState ───────────────────────────────────────────

export function parseDatum(df: Core.PlutusList, policyId: string, oneShotTx: string, oneShotIdx: number): MarketState {
  const resolvedField = df.get(12)!.asConstrPlutusData()!;
  const isResolved = resolvedField.getAlternative() === 1n;

  let winningSide: "yes" | "no" | null = null;
  if (isResolved) {
    const wsField = df.get(13)!.asConstrPlutusData()!;
    if (wsField.getAlternative() === 0n) {
      const inner = wsField.getData().get(0)!.asConstrPlutusData()!;
      winningSide = inner.getAlternative() === 0n ? "yes" : "no";
    }
  }

  return {
    policyId,
    oneShotTx,
    oneShotIdx,
    creator: Buffer.from(df.get(0)!.asBoundedBytes()!).toString("hex"),
    feedId: Number(df.get(2)!.asInteger()!),
    targetPrice: df.get(3)!.asInteger()!,
    resolutionTime: Number(df.get(4)!.asInteger()!),
    yesReserve: df.get(6)!.asInteger()!,
    noReserve: df.get(7)!.asInteger()!,
    k: df.get(8)!.asInteger()!,
    totalYesMinted: df.get(9)!.asInteger()!,
    totalNoMinted: df.get(10)!.asInteger()!,
    totalAda: df.get(11)!.asInteger()!,
    resolved: isResolved,
    winningSide,
  };
}

// ── Create market ────────────────────────────────────────────────────────

export async function createMarket(opts: {
  blaze: Blaze<Blockfrost, HotWallet>;
  provider: Blockfrost;
  wallet: HotWallet;
  feedName: string;
  seedAda: bigint;
  resolutionMs: number;
}) {
  const { blaze, provider, wallet, feedName, resolutionMs } = opts;
  const seedLovelace = opts.seedAda * 1_000_000n;

  const update = await getPythUpdate(feedName);
  console.log(`[market] Price: ${update.price} (feed ${update.feedId})`);

  const utxos = await provider.getUnspentOutputs(wallet.address);
  const oneShot = utxos[0]!;
  const oneShotRef = oneShot.input();

  const { marketScript, policyId, scriptAddr } = deriveScript(
    oneShotRef.transactionId().toString(),
    Number(oneShotRef.index())
  );

  const paymentHash = wallet.address.getProps().paymentPart!.hash;
  const resolutionTime = BigInt(Date.now() + resolutionMs);

  const datum = mkMarketDatum({
    creator: paymentHash,
    pythId: PYTH_POLICY_ID,
    feedId: update.feedId,
    targetPrice: update.price,
    resolutionTime,
    tokenPolicy: policyId,
    seed: seedLovelace,
  });

  const stateThreadName = Core.AssetName("");
  const mintAssets = new Map<Core.AssetName, bigint>();
  mintAssets.set(stateThreadName, 1n);
  mintAssets.set(Core.AssetName("594553"), seedLovelace);
  mintAssets.set(Core.AssetName("4e4f"), seedLovelace);

  const stateThreadAsset = Core.AssetId.fromParts(policyId, stateThreadName);
  const lockValue = new Core.Value(seedLovelace);
  lockValue.setMultiasset(new Map([[stateThreadAsset, 1n]]));

  const tx = await blaze
    .newTransaction()
    .addInput(oneShot)
    .lockAssets(scriptAddr, lockValue, datum)
    .addMint(policyId, mintAssets, MINT_TOKENS)
    .provideScript(marketScript)
    .complete();

  const signed = await blaze.signTransaction(tx);
  const txId = await submitTx(signed);

  return {
    txId,
    policyId,
    oneShotTx: oneShotRef.transactionId().toString(),
    oneShotIdx: Number(oneShotRef.index()),
    targetPrice: update.price,
    resolutionTime: Number(resolutionTime),
  };
}

// ── Resolve market ───────────────────────────────────────────────────────

export async function resolveMarket(opts: {
  blaze: Blaze<Blockfrost, HotWallet>;
  provider: Blockfrost;
  wallet: HotWallet;
  policyId: string;
  oneShotTx: string;
  oneShotIdx: number;
}) {
  const { blaze, provider, wallet, policyId: policyIdHex, oneShotTx, oneShotIdx } = opts;

  const { marketScript, policyId, scriptAddr, marketUtxo, df } = await deriveMarket(
    provider, policyIdHex, oneShotTx, oneShotIdx
  );

  const feedId = Number(df.get(2)!.asInteger()!);
  const targetPrice = df.get(3)!.asInteger()!;
  const resolutionTime = Number(df.get(4)!.asInteger()!);
  const totalAda = df.get(11)!.asInteger()!;
  const inputLovelace = marketUtxo.output().amount().coin();

  const feedName = Object.entries(FEED_NAME_TO_ID).find(([_, id]) => id === feedId)?.[0] ?? String(feedId);
  const update = await getPythUpdate(feedName);

  const yesWins = update.price > targetPrice;
  const winningSide = constr(0, [yesWins ? constr(0, []) : constr(1, [])]);
  const resolvedDatum = constr(0, [
    df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!,
    df.get(5)!, df.get(6)!, df.get(7)!, df.get(8)!, df.get(9)!,
    df.get(10)!, df.get(11)!,
    TRUE, winningSide,
  ]);

  // Pyth State UTxO
  const pythStateAddr = Core.addressFromBech32(
    "addr_test1wrm3tr5zpw9k2nefjtsz66wfzn6flnphr5kd6ak9ufrl3wcqqfyn8"
  );
  const pythUtxos = await provider.getUnspentOutputs(pythStateAddr);
  const pythStateUtxo = pythUtxos.find((u) => {
    const ma = u.output().amount().multiasset();
    if (!ma) return false;
    for (const [assetId] of ma) {
      if (assetId.includes(PYTH_POLICY_ID)) return true;
    }
    return false;
  });
  if (!pythStateUtxo) throw new Error("Pyth State UTxO not found");

  const pythRefScript = pythStateUtxo.output().scriptRef()!;
  const pythWithdrawHash = pythRefScript.hash();

  const updateBuf = Buffer.from(update.solanaHex, "hex");
  const pythRedeemerList = new Core.PlutusList();
  pythRedeemerList.add(Core.PlutusData.newBytes(updateBuf));
  const pythRedeemer = Core.PlutusData.newList(pythRedeemerList);

  const outputLovelace = inputLovelace > totalAda ? inputLovelace : totalAda;
  const stateThreadAsset = Core.AssetId.fromParts(policyId, Core.AssetName(""));
  const lockValue = new Core.Value(outputLovelace);
  lockValue.setMultiasset(new Map([[stateThreadAsset, 1n]]));

  const pythRewardAddrObj = Core.RewardAddress.fromCredentials(
    Core.NetworkId.Testnet,
    { type: Core.CredentialType.ScriptHash, hash: pythWithdrawHash as Core.Hash28ByteBase16 }
  );
  const pythRewardAccount = Core.RewardAccount(pythRewardAddrObj.toAddress().toBech32());

  const slotConfig = getSlotConfig();
  const posixToSlotCeil = (posixMs: number) =>
    Math.ceil((posixMs - slotConfig.zeroTime) / slotConfig.slotLength) + slotConfig.zeroSlot;

  const now = Date.now() - 60_000;
  const effectiveTime = Math.max(resolutionTime, now);
  const validFrom = Core.Slot(posixToSlotCeil(effectiveTime));
  const validUntil = Core.Slot(validFrom + 300);

  const uplcEvaluator = await makeEvaluator(provider);

  const tx = await blaze
    .newTransaction()
    .useEvaluator(uplcEvaluator)
    .addInput(marketUtxo, RESOLVE)
    .addReferenceInput(pythStateUtxo)
    .lockAssets(scriptAddr, lockValue, resolvedDatum)
    .addWithdrawal(pythRewardAccount, 0n, pythRedeemer)
    .addRequiredSigner(Core.Ed25519KeyHashHex(wallet.address.getProps().paymentPart!.hash))
    .setValidFrom(validFrom)
    .setValidUntil(validUntil)
    .provideScript(marketScript)
    .complete();

  const signed = await blaze.signTransaction(tx);
  const txId = await submitTx(signed);

  return { txId, winner: (yesWins ? "yes" : "no") as "yes" | "no" };
}

// ── Build bet tx (unsigned — for wallet signing) ─────────────────────────

export async function buildBetTx(opts: {
  blaze: Blaze<Blockfrost, HotWallet>;
  provider: Blockfrost;
  policyId: string;
  oneShotTx: string;
  oneShotIdx: number;
  direction: "yes" | "no";
  amountAda: bigint;
}) {
  const { blaze, provider, policyId: policyIdHex, oneShotTx, oneShotIdx, direction, amountAda } = opts;
  const amountLovelace = amountAda * 1_000_000n;

  const { marketScript, policyId, scriptAddr, marketUtxo, df } = await deriveMarket(
    provider, policyIdHex, oneShotTx, oneShotIdx
  );

  const yesReserve = df.get(6)!.asInteger()!;
  const noReserve = df.get(7)!.asInteger()!;
  const k = df.get(8)!.asInteger()!;
  const totalYesMinted = df.get(9)!.asInteger()!;
  const totalNoMinted = df.get(10)!.asInteger()!;
  const totalAda = df.get(11)!.asInteger()!;
  const resolutionTime = Number(df.get(4)!.asInteger()!);
  const inputLovelace = marketUtxo.output().amount().coin();

  let tokensOut: bigint;
  let newDatumFields: Core.PlutusData[];
  if (direction === "yes") {
    tokensOut = yesReserve - k / (noReserve + amountLovelace);
    if (tokensOut <= 0n) throw new Error("Bet too small");
    newDatumFields = [
      df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!, df.get(5)!,
      integer(yesReserve - tokensOut), integer(noReserve + amountLovelace),
      df.get(8)!, integer(totalYesMinted + tokensOut), df.get(10)!,
      integer(totalAda + amountLovelace), df.get(12)!, df.get(13)!,
    ];
  } else {
    tokensOut = noReserve - k / (yesReserve + amountLovelace);
    if (tokensOut <= 0n) throw new Error("Bet too small");
    newDatumFields = [
      df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!, df.get(5)!,
      integer(yesReserve + amountLovelace), integer(noReserve - tokensOut),
      df.get(8)!, df.get(9)!, integer(totalNoMinted + tokensOut),
      integer(totalAda + amountLovelace), df.get(12)!, df.get(13)!,
    ];
  }

  const newDatum = constr(0, newDatumFields);
  const tokenName = direction === "yes" ? Core.AssetName("594553") : Core.AssetName("4e4f");
  const mintAssets = new Map<Core.AssetName, bigint>();
  mintAssets.set(tokenName, tokensOut);

  const stateThreadAssetId = Core.AssetId.fromParts(policyId, Core.AssetName(""));
  const lockValue = new Core.Value(inputLovelace + amountLovelace);
  lockValue.setMultiasset(new Map([[stateThreadAssetId, 1n]]));

  const betRedeemer = constr(0, [
    direction === "yes" ? constr(0, []) : constr(1, []),
    integer(amountLovelace),
  ]);

  const slotConfig = getSlotConfig();
  const posixToSlotFloor = (posixMs: number) =>
    Math.floor((posixMs - slotConfig.zeroTime) / slotConfig.slotLength) + slotConfig.zeroSlot;
  const validFrom = Core.Slot(posixToSlotFloor(Date.now() - 60_000));
  const validUntil = Core.Slot(posixToSlotFloor(resolutionTime));

  const uplcEvaluator = await makeEvaluator(provider);

  const tx = await blaze
    .newTransaction()
    .useEvaluator(uplcEvaluator)
    .addInput(marketUtxo, betRedeemer)
    .lockAssets(scriptAddr, lockValue, newDatum)
    .addMint(policyId, mintAssets, MINT_TOKENS)
    .setValidFrom(validFrom)
    .setValidUntil(validUntil)
    .provideScript(marketScript)
    .complete();

  return { tx, tokensOut };
}

// ── Build bet tx for browser wallet (user's UTxOs + change address) ──────

export async function buildBetTxForWallet(opts: {
  provider: Blockfrost;
  policyId: string;
  oneShotTx: string;
  oneShotIdx: number;
  direction: "yes" | "no";
  amountAda: bigint;
  walletUtxos: string[];   // CIP-30 CBOR hex UTxOs
  changeAddress: string;   // CIP-30 hex address
}) {
  const { provider, policyId: policyIdHex, oneShotTx, oneShotIdx, direction, amountAda } = opts;
  const amountLovelace = amountAda * 1_000_000n;

  const { marketScript, policyId, scriptAddr, marketUtxo, df } = await deriveMarket(
    provider, policyIdHex, oneShotTx, oneShotIdx
  );

  const yesReserve = df.get(6)!.asInteger()!;
  const noReserve = df.get(7)!.asInteger()!;
  const k = df.get(8)!.asInteger()!;
  const totalYesMinted = df.get(9)!.asInteger()!;
  const totalNoMinted = df.get(10)!.asInteger()!;
  const totalAda = df.get(11)!.asInteger()!;
  const resolutionTime = Number(df.get(4)!.asInteger()!);
  const inputLovelace = marketUtxo.output().amount().coin();

  let tokensOut: bigint;
  let newDatumFields: Core.PlutusData[];
  if (direction === "yes") {
    tokensOut = yesReserve - k / (noReserve + amountLovelace);
    if (tokensOut <= 0n) throw new Error("Bet too small");
    newDatumFields = [
      df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!, df.get(5)!,
      integer(yesReserve - tokensOut), integer(noReserve + amountLovelace),
      df.get(8)!, integer(totalYesMinted + tokensOut), df.get(10)!,
      integer(totalAda + amountLovelace), df.get(12)!, df.get(13)!,
    ];
  } else {
    tokensOut = noReserve - k / (yesReserve + amountLovelace);
    if (tokensOut <= 0n) throw new Error("Bet too small");
    newDatumFields = [
      df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!, df.get(5)!,
      integer(yesReserve + amountLovelace), integer(noReserve - tokensOut),
      df.get(8)!, df.get(9)!, integer(totalNoMinted + tokensOut),
      integer(totalAda + amountLovelace), df.get(12)!, df.get(13)!,
    ];
  }

  const newDatum = constr(0, newDatumFields);
  const tokenName = direction === "yes" ? Core.AssetName("594553") : Core.AssetName("4e4f");
  const mintAssets = new Map<Core.AssetName, bigint>();
  mintAssets.set(tokenName, tokensOut);

  const stateThreadAssetId = Core.AssetId.fromParts(policyId, Core.AssetName(""));
  const lockValue = new Core.Value(inputLovelace + amountLovelace);
  lockValue.setMultiasset(new Map([[stateThreadAssetId, 1n]]));

  const betRedeemer = constr(0, [
    direction === "yes" ? constr(0, []) : constr(1, []),
    integer(amountLovelace),
  ]);

  const slotConfig = getSlotConfig();
  const posixToSlotFloor = (posixMs: number) =>
    Math.floor((posixMs - slotConfig.zeroTime) / slotConfig.slotLength) + slotConfig.zeroSlot;
  const validFrom = Core.Slot(posixToSlotFloor(Date.now() - 60_000));
  const validUntil = Core.Slot(posixToSlotFloor(resolutionTime));

  // Parse user's CIP-30 UTxOs and change address
  const userUtxos = opts.walletUtxos.map((hex) =>
    Core.TransactionUnspentOutput.fromCbor(Core.TxCBOR(hex))
  );
  const changeAddr = Core.Address.fromBytes(Core.HexBlob(opts.changeAddress));

  const uplcEvaluator = await makeEvaluator(provider);
  const params = await provider.getParameters();

  // Build tx with user's UTxOs for coin selection
  const { TxBuilder } = await import("@blaze-cardano/tx");
  const txBuilder = new TxBuilder(params);
  txBuilder
    .setNetworkId(Core.NetworkId.Testnet)
    .useEvaluator(uplcEvaluator)
    .setChangeAddress(changeAddr)
    .addInput(marketUtxo, betRedeemer)
    .lockAssets(scriptAddr, lockValue, newDatum)
    .addMint(policyId, mintAssets, MINT_TOKENS)
    .setValidFrom(validFrom)
    .setValidUntil(validUntil)
    .provideScript(marketScript)
    .addUnspentOutputs(userUtxos);

  const tx = await txBuilder.complete();
  return { tx, tokensOut };
}
