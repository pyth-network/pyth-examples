import * as fs from "fs";
import * as Core from "@blaze-cardano/core";
import { HotWallet } from "@blaze-cardano/wallet";
import { Blockfrost } from "@blaze-cardano/query";
import { Blaze } from "@blaze-cardano/sdk";
import { applyParams } from "@blaze-cardano/uplc";
import { makeUplcEvaluator } from "@blaze-cardano/vm";

// ── Config from env (Bun auto-loads .env) ────────────────────────────────────

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY!;
const NETWORK = process.env.NETWORK ?? "Preprod";
const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC!;
const PYTH_POLICY_ID = process.env.PYTH_POLICY_ID!;
const PYTH_API_KEY = process.env.PYTH_API_KEY!;
const FEED_ID = process.env.FEED_ID ?? "BTC/USD";

// ── Blueprint ────────────────────────────────────────────────────────────────

const blueprint = JSON.parse(
  fs.readFileSync("../contracts/plutus.json", "utf-8")
);

function getValidator(title: string): string {
  const v = blueprint.validators.find((v: any) => v.title === title);
  if (!v) throw new Error(`Validator not found: ${title}`);
  return v.compiledCode;
}

const marketSpendCode = getValidator("market.market.spend");

// ── Datum helpers ────────────────────────────────────────────────────────────

function constr(idx: number, fields: Core.PlutusData[]): Core.PlutusData {
  const list = new Core.PlutusList();
  for (const f of fields) list.add(f);
  return Core.PlutusData.newConstrPlutusData(
    new Core.ConstrPlutusData(BigInt(idx), list)
  );
}

function bytes(hex: string): Core.PlutusData {
  return Core.PlutusData.newBytes(Buffer.from(hex, "hex"));
}

function integer(n: bigint): Core.PlutusData {
  return Core.PlutusData.newInteger(n);
}

const FALSE = constr(0, []);
const TRUE = constr(1, []);
const NONE = constr(1, []);
const MINT_TOKENS = constr(0, []);
const BURN_TOKENS = constr(1, []);
const RESOLVE = constr(1, []);

function mkMarketDatum(p: {
  creator: string;
  pythId: string;
  feedId: number;
  targetPrice: bigint;
  resolutionTime: bigint;
  tokenPolicy: string;
  seed: bigint;
}): Core.PlutusData {
  return constr(0, [
    bytes(p.creator),
    bytes(p.pythId),
    integer(BigInt(p.feedId)),
    integer(p.targetPrice),
    integer(p.resolutionTime),
    bytes(p.tokenPolicy),
    integer(p.seed), // yes_reserve
    integer(p.seed), // no_reserve
    integer(p.seed * p.seed), // k
    integer(p.seed), // total_yes_minted
    integer(p.seed), // total_no_minted
    integer(p.seed), // total_ada
    FALSE, // resolved
    NONE, // winning_side
  ]);
}

// ── Pyth API ─────────────────────────────────────────────────────────────────

const FEED_NAME_TO_ID: Record<string, number> = {
  "BTC/USD": 1,
  "ETH/USD": 2,
  "ADA/USD": 16,
};

async function getPythUpdate(feedName: string) {
  const feedId = FEED_NAME_TO_ID[feedName] ?? parseInt(feedName);
  const res = await fetch("https://pyth-lazer.dourolabs.app/v1/latest_price", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PYTH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "fixed_rate@200ms",
      formats: ["solana"],
      priceFeedIds: [feedId],
      properties: ["price", "exponent"],
      jsonBinaryEncoding: "hex",
      parsed: true,
    }),
  });
  const data = (await res.json()) as any;
  return {
    solanaHex: data.solana?.data as string,
    price: BigInt(data.parsed?.priceFeeds?.[0]?.price ?? "0"),
    exponent: data.parsed?.priceFeeds?.[0]?.exponent ?? -8,
    feedId,
  };
}

// ── Wallet setup ─────────────────────────────────────────────────────────────

async function setupBlaze() {
  const networkId =
    NETWORK === "Mainnet" ? Core.NetworkId.Mainnet : Core.NetworkId.Testnet;
  const blazeNetwork = `cardano-${NETWORK.toLowerCase()}` as "cardano-preprod" | "cardano-preview" | "cardano-mainnet";
  const provider = new Blockfrost({
    network: blazeNetwork,
    projectId: BLOCKFROST_API_KEY,
  });

  const entropy = Core.mnemonicToEntropy(WALLET_MNEMONIC, Core.wordlist);
  const masterKey = Core.Bip32PrivateKey.fromBip39Entropy(
    Buffer.from(entropy),
    ""
  );
  const wallet = await HotWallet.fromMasterkey(
    masterKey.hex(),
    provider,
    networkId
  );

  const blaze = await Blaze.from(provider, wallet);
  console.log(`  Wallet: ${wallet.address.toBech32()}`);
  return { blaze, provider, wallet };
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdPrice() {
  const feedName = process.argv[3] ?? FEED_ID;
  const update = await getPythUpdate(feedName);
  const display = Number(update.price) * Math.pow(10, update.exponent);
  console.log(
    `  ${feedName}: ${display.toFixed(2)} (raw: ${update.price}, exp: ${update.exponent})`
  );
}

async function cmdDeploy() {
  const { blaze, provider, wallet } = await setupBlaze();

  // Deploy unparameterized market script as reference
  const script = Core.Script.newPlutusV3Script(
    new Core.PlutusV3Script(Core.HexBlob(marketSpendCode))
  );

  const tx = await blaze
    .newTransaction()
    .payToAddressWithData(
      wallet.address,
      { kind: Core.DatumKind.Inline, value: Core.PlutusData.newBytes(Buffer.from("deploy", "utf-8")) },
      new Core.Value(5_000_000n),
      script
    )
    .complete();

  const signed = await blaze.signTransaction(tx);
  const txId = await blaze.provider.postTransactionToChain(signed);
  console.log(`  Deploy tx: ${txId}`);
}

async function cmdCreate() {
  const { blaze, provider, wallet } = await setupBlaze();
  const feedName = process.argv[3] ?? FEED_ID;
  const seedAda = BigInt(process.argv[4] ?? "10") * 1_000_000n;

  // Get current price
  const update = await getPythUpdate(feedName);
  console.log(`  Price: ${update.price} (feed ${update.feedId})`);

  // Get one-shot UTxO
  const utxos = await provider.getUnspentOutputs(wallet.address);
  const oneShot = utxos[0]!;
  const oneShotRef = oneShot.input();
  console.log(`  One-shot: ${oneShotRef.transactionId()}#${oneShotRef.index()}`);

  // Apply params: MarketParams(constr(0, [OutputReference(constr(0, [txId, idx]))]))
  const oneShotParam = constr(0, [
    constr(0, [
      bytes(oneShotRef.transactionId().toString()),
      integer(BigInt(oneShotRef.index())),
    ]),
  ]);

  const parameterizedCode = applyParams(
    Core.HexBlob(marketSpendCode),
    oneShotParam
  );
  const marketScript = Core.Script.newPlutusV3Script(
    new Core.PlutusV3Script(Core.HexBlob(parameterizedCode))
  );
  const policyId = Core.PolicyId(
    marketScript.hash().toString() as Core.Hash28ByteBase16
  );
  const scriptAddr = Core.addressFromValidator(Core.NetworkId.Testnet, marketScript);

  console.log(`  Policy: ${policyId}`);
  console.log(`  Address: ${scriptAddr.toBech32()}`);

  // Build datum
  const paymentHash = wallet.address.getProps().paymentPart!.hash;
  const resolutionTime = BigInt(Date.now() + 300_000);

  const datum = mkMarketDatum({
    creator: paymentHash,
    pythId: PYTH_POLICY_ID,
    feedId: update.feedId,
    targetPrice: update.price,
    resolutionTime,
    tokenPolicy: policyId,
    seed: seedAda,
  });

  // Build tx: consume one-shot + lock ADA at script + mint tokens
  // Mint + lock in one tx (script in witness set for mint)
  const stateThreadName = Core.AssetName("");
  const yesName = Core.AssetName("594553");
  const noName = Core.AssetName("4e4f");

  const mintAssets = new Map<Core.AssetName, bigint>();
  mintAssets.set(stateThreadName, 1n);
  mintAssets.set(yesName, seedAda);
  mintAssets.set(noName, seedAda);

  const stateThreadAsset = Core.AssetId.fromParts(policyId, stateThreadName);
  const lockValue = new Core.Value(seedAda);
  lockValue.setMultiasset(new Map([[stateThreadAsset, 1n]]));

  const tx = await blaze
    .newTransaction()
    .addInput(oneShot)
    .lockAssets(scriptAddr, lockValue, datum)
    .addMint(policyId, mintAssets, MINT_TOKENS)
    .provideScript(marketScript)
    .complete();

  const signed = await blaze.signTransaction(tx);
  const txId = await blaze.provider.postTransactionToChain(signed);
  console.log(`\n  Market created: ${txId}`);
  console.log(`  Policy: ${policyId}`);
  console.log(`  One-shot: ${oneShotRef.transactionId()}#${oneShotRef.index()}`);
  console.log(`\n  Commands (use policy + oneshot for all):`);
  console.log(`  bun run index.ts bet ${policyId} ${oneShotRef.transactionId()} ${oneShotRef.index()} yes 2`);
  console.log(`  bun run index.ts resolve ${policyId} ${oneShotRef.transactionId()} ${oneShotRef.index()}`);
  console.log(`  bun run index.ts claim ${policyId} ${oneShotRef.transactionId()} ${oneShotRef.index()}`);
}

async function cmdResolve() {
  const { blaze, provider, wallet } = await setupBlaze();
  const policyIdHex = process.argv[3]!;
  const oneShotTxHash = process.argv[4]!;
  const oneShotIdx = parseInt(process.argv[5] ?? "0");

  if (!policyIdHex || !oneShotTxHash) {
    throw new Error("Usage: resolve <policy> <oneshot_tx> <oneshot_idx>");
  }

  const { marketScript, policyId, scriptAddr, marketUtxo, df } = await deriveMarket(
    provider, policyIdHex, oneShotTxHash, oneShotIdx
  );
  console.log(`  Market UTxO: ${marketUtxo.input().transactionId()}#${marketUtxo.input().index()}`);

  const feedId = Number(df.get(2)!.asInteger()!);
  const targetPrice = df.get(3)!.asInteger()!;
  const resolutionTime = Number(df.get(4)!.asInteger()!);
  const totalAda = df.get(11)!.asInteger()!;
  const inputLovelace = marketUtxo.output().amount().coin();
  console.log(`  Feed: ${feedId}, Target: ${targetPrice}, Resolution: ${new Date(resolutionTime).toISOString()}`);
  console.log(`  Input lovelace: ${inputLovelace}, Datum total_ada: ${totalAda}`);

  // Get Pyth price
  const feedName = Object.entries(FEED_NAME_TO_ID).find(([_, id]) => id === feedId)?.[0] ?? String(feedId);
  const update = await getPythUpdate(feedName);
  console.log(`  Pyth price: ${update.price}, solana hex len: ${update.solanaHex.length}`);

  const yesWins = update.price > targetPrice;
  console.log(`  Winner: ${yesWins ? "YES" : "NO"} (price ${update.price} ${yesWins ? ">" : "<="} target ${targetPrice})`);

  // Build resolved datum: copy fields 0-11 unchanged, set resolved=True + winning_side
  // Option<BetDirection>: Some(Yes)=constr(0,[constr(0,[])]), Some(No)=constr(0,[constr(1,[])])
  const winningSide = constr(0, [yesWins ? constr(0, []) : constr(1, [])]);
  const resolvedDatum = constr(0, [
    df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!,
    df.get(5)!, df.get(6)!, df.get(7)!, df.get(8)!, df.get(9)!,
    df.get(10)!, df.get(11)!,
    TRUE, winningSide,
  ]);

  // Find Pyth State UTxO
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
  console.log(`  Pyth State: ${pythStateUtxo.input().transactionId()}#${pythStateUtxo.input().index()}`);

  // Get Pyth withdraw script from ref
  const pythRefScript = pythStateUtxo.output().scriptRef()!;
  const pythWithdrawHash = pythRefScript.hash();
  console.log(`  Pyth withdraw: ${pythWithdrawHash}`);

  // Build Pyth redeemer: List<ByteArray>
  const updateBuf = Buffer.from(update.solanaHex, "hex");
  const pythRedeemerList = new Core.PlutusList();
  pythRedeemerList.add(Core.PlutusData.newBytes(updateBuf));
  const pythRedeemer = Core.PlutusData.newList(pythRedeemerList);

  // Lock value: use max(inputLovelace, totalAda) to satisfy output_lovelace >= input_lovelace
  const outputLovelace = inputLovelace > totalAda ? inputLovelace : totalAda;
  const stateThreadAsset = Core.AssetId.fromParts(policyId, Core.AssetName(""));
  const lockValue = new Core.Value(outputLovelace);
  lockValue.setMultiasset(new Map([[stateThreadAsset, 1n]]));

  // Pyth reward address for withdraw-0
  const pythRewardAddrObj = Core.RewardAddress.fromCredentials(
    Core.NetworkId.Testnet,
    { type: Core.CredentialType.ScriptHash, hash: pythWithdrawHash as Core.Hash28ByteBase16 }
  );
  const pythRewardAccount = Core.RewardAccount(pythRewardAddrObj.toAddress().toBech32());

  // Build tx: spend market + Pyth withdraw-0 + lock resolved datum
  const spendRedeemer = RESOLVE; // constr(1, [])

  // Slot config + posixToSlot with ceil to ensure lower bound >= resolution_time
  const slotConfig = Core.SLOT_CONFIG_NETWORK[NETWORK as keyof typeof Core.SLOT_CONFIG_NETWORK]
    ?? Core.SLOT_CONFIG_NETWORK.Preprod;
  const posixToSlot = (posixMs: number) =>
    Math.ceil((posixMs - slotConfig.zeroTime) / slotConfig.slotLength) + slotConfig.zeroSlot;

  // validFrom must be >= resolution_time AND within the current slot range
  const now = Date.now() - 60_000;
  const effectiveTime = Math.max(resolutionTime, now);
  const validFrom = Core.Slot(posixToSlot(effectiveTime));
  const validUntil = Core.Slot(validFrom + 300);
  console.log(`  Valid from slot: ${validFrom}, until: ${validUntil}`);

  // Use real UPLC VM evaluator — will run Plutus scripts locally and surface errors
  const params = await provider.getParameters();
  const uplcEvaluator = makeUplcEvaluator(params, 1.2, 1.2, slotConfig);

  let tx;
  try {
    tx = await blaze
      .newTransaction()
      .useEvaluator(uplcEvaluator)
      .addInput(marketUtxo, spendRedeemer)
      .addReferenceInput(pythStateUtxo)
      .lockAssets(scriptAddr, lockValue, resolvedDatum)
      .addWithdrawal(pythRewardAccount, 0n, pythRedeemer)
      .addRequiredSigner(Core.Ed25519KeyHashHex(wallet.address.getProps().paymentPart!.hash))
      .setValidFrom(validFrom)
      .setValidUntil(validUntil)
      .provideScript(marketScript)
      .complete();
  } catch (e: any) {
    console.error(`\n  Build/eval error:`, e.message ?? e);
    throw e;
  }

  console.log(`  Tx built, signing...`);
  const signed = await blaze.signTransaction(tx);

  // Submit via Blockfrost
  const txCbor = signed.toCbor();
  const submitRes = await fetch(
    `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0/tx/submit`,
    {
      method: "POST",
      headers: {
        project_id: BLOCKFROST_API_KEY,
        "Content-Type": "application/cbor",
      },
      body: Buffer.from(txCbor, "hex"),
    }
  );
  const submitBody = await submitRes.text();
  if (!submitRes.ok) {
    console.error(`  Submit failed (${submitRes.status}): ${submitBody}`);
    throw new Error(submitBody);
  }
  console.log(`\n  Resolved: ${submitBody}`);
}

// ── Shared: derive market script + find UTxO ─────────────────────────────

async function deriveMarket(provider: any, policyIdHex: string, oneShotTxHash: string, oneShotIdx: number) {
  const oneShotParam = constr(0, [
    constr(0, [bytes(oneShotTxHash), integer(BigInt(oneShotIdx))]),
  ]);
  const parameterizedCode = applyParams(Core.HexBlob(marketSpendCode), oneShotParam);
  const marketScript = Core.Script.newPlutusV3Script(
    new Core.PlutusV3Script(Core.HexBlob(parameterizedCode))
  );
  const policyId = Core.PolicyId(policyIdHex as Core.Hash28ByteBase16);
  const scriptAddr = Core.addressFromValidator(Core.NetworkId.Testnet, marketScript);

  // Find market UTxO at script address (has the state thread token)
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

// ── Bet command ──────────────────────────────────────────────────────────

async function cmdBet() {
  const { blaze, provider, wallet } = await setupBlaze();
  const policyIdHex = process.argv[3]!;
  const oneShotTxHash = process.argv[4]!;
  const oneShotIdx = parseInt(process.argv[5] ?? "0");
  const direction = (process.argv[6] ?? "yes").toLowerCase();
  const amountAda = BigInt(process.argv[7] ?? "2");
  const amountLovelace = amountAda * 1_000_000n;

  if (!policyIdHex || !oneShotTxHash) {
    throw new Error("Usage: bet <policy> <oneshot_tx> <oneshot_idx> <yes|no> <amount_ada>");
  }

  const { marketScript, policyId, scriptAddr, marketUtxo, df } = await deriveMarket(
    provider, policyIdHex, oneShotTxHash, oneShotIdx
  );
  console.log(`  Market: ${marketUtxo.input().transactionId()}#${marketUtxo.input().index()}`);

  // Parse datum fields
  const yesReserve = df.get(6)!.asInteger()!;
  const noReserve = df.get(7)!.asInteger()!;
  const k = df.get(8)!.asInteger()!;
  const totalYesMinted = df.get(9)!.asInteger()!;
  const totalNoMinted = df.get(10)!.asInteger()!;
  const totalAda = df.get(11)!.asInteger()!;
  const resolutionTime = Number(df.get(4)!.asInteger()!);
  const inputLovelace = marketUtxo.output().amount().coin();

  console.log(`  Reserves: YES=${yesReserve}, NO=${noReserve}, k=${k}`);
  console.log(`  Betting ${direction.toUpperCase()} with ${amountAda} ADA (${amountLovelace} lovelace)`);

  // AMM calculation — must match contract's integer division exactly
  let tokensOut: bigint;
  let newDatumFields: Core.PlutusData[];
  if (direction === "yes") {
    tokensOut = yesReserve - k / (noReserve + amountLovelace);
    if (tokensOut <= 0n) throw new Error(`tokens_out=${tokensOut}, bet too small`);
    newDatumFields = [
      df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!, df.get(5)!,
      integer(yesReserve - tokensOut),       // yes_reserve
      integer(noReserve + amountLovelace),   // no_reserve
      df.get(8)!,                            // k unchanged
      integer(totalYesMinted + tokensOut),   // total_yes_minted
      df.get(10)!,                           // total_no_minted unchanged
      integer(totalAda + amountLovelace),    // total_ada
      df.get(12)!, df.get(13)!,             // resolved, winning_side unchanged
    ];
  } else {
    tokensOut = noReserve - k / (yesReserve + amountLovelace);
    if (tokensOut <= 0n) throw new Error(`tokens_out=${tokensOut}, bet too small`);
    newDatumFields = [
      df.get(0)!, df.get(1)!, df.get(2)!, df.get(3)!, df.get(4)!, df.get(5)!,
      integer(yesReserve + amountLovelace),  // yes_reserve
      integer(noReserve - tokensOut),        // no_reserve
      df.get(8)!,                            // k unchanged
      df.get(9)!,                            // total_yes_minted unchanged
      integer(totalNoMinted + tokensOut),    // total_no_minted
      integer(totalAda + amountLovelace),    // total_ada
      df.get(12)!, df.get(13)!,             // resolved, winning_side unchanged
    ];
  }
  console.log(`  Tokens out: ${tokensOut}`);

  const newDatum = constr(0, newDatumFields);

  // Mint tokens
  const tokenName = direction === "yes" ? Core.AssetName("594553") : Core.AssetName("4e4f");
  const mintAssets = new Map<Core.AssetName, bigint>();
  mintAssets.set(tokenName, tokensOut);

  // Lock value: input lovelace + bet amount + state thread
  const stateThreadAssetId = Core.AssetId.fromParts(policyId, Core.AssetName(""));
  const lockValue = new Core.Value(inputLovelace + amountLovelace);
  lockValue.setMultiasset(new Map([[stateThreadAssetId, 1n]]));

  // Bet redeemer: Bet { direction, amount } = constr(0, [dir, amount])
  const betRedeemer = constr(0, [
    direction === "yes" ? constr(0, []) : constr(1, []),
    integer(amountLovelace),
  ]);

  // Validity: upper bound <= resolution_time (use floor for <=)
  const slotConfig = Core.SLOT_CONFIG_NETWORK[NETWORK as keyof typeof Core.SLOT_CONFIG_NETWORK]
    ?? Core.SLOT_CONFIG_NETWORK.Preprod;
  const posixToSlotFloor = (posixMs: number) =>
    Math.floor((posixMs - slotConfig.zeroTime) / slotConfig.slotLength) + slotConfig.zeroSlot;
  const validFrom = Core.Slot(posixToSlotFloor(Date.now() - 60_000));
  const validUntil = Core.Slot(posixToSlotFloor(resolutionTime));
  console.log(`  Valid from: ${validFrom}, until: ${validUntil} (resolution)`);

  const params = await provider.getParameters();
  const uplcEvaluator = makeUplcEvaluator(params, 1.2, 1.2, slotConfig);

  let tx;
  try {
    tx = await blaze
      .newTransaction()
      .useEvaluator(uplcEvaluator)
      .addInput(marketUtxo, betRedeemer)
      .lockAssets(scriptAddr, lockValue, newDatum)
      .addMint(policyId, mintAssets, MINT_TOKENS)
      .setValidFrom(validFrom)
      .setValidUntil(validUntil)
      .provideScript(marketScript)
      .complete();
  } catch (e: any) {
    console.error(`\n  Build/eval error:`, e.message ?? e);
    throw e;
  }

  console.log(`  Tx built, signing...`);
  const signed = await blaze.signTransaction(tx);
  const txCbor = signed.toCbor();
  const submitRes = await fetch(
    `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0/tx/submit`,
    {
      method: "POST",
      headers: { project_id: BLOCKFROST_API_KEY, "Content-Type": "application/cbor" },
      body: Buffer.from(txCbor, "hex"),
    }
  );
  const submitBody = await submitRes.text();
  if (!submitRes.ok) {
    console.error(`  Submit failed (${submitRes.status}): ${submitBody}`);
    throw new Error(submitBody);
  }
  console.log(`\n  Bet placed: ${submitBody}`);
  console.log(`  Got ${tokensOut} ${direction.toUpperCase()} tokens`);
}

// ── Claim command ────────────────────────────────────────────────────────

async function cmdClaim() {
  const { blaze, provider, wallet } = await setupBlaze();
  const policyIdHex = process.argv[3]!;
  const oneShotTxHash = process.argv[4]!;
  const oneShotIdx = parseInt(process.argv[5] ?? "0");
  const burnAmountArg = process.argv[6]; // optional — defaults to all winning tokens in wallet

  if (!policyIdHex || !oneShotTxHash) {
    throw new Error("Usage: claim <policy> <oneshot_tx> <oneshot_idx> [burn_amount]");
  }

  const { marketScript, policyId, scriptAddr, marketUtxo, df } = await deriveMarket(
    provider, policyIdHex, oneShotTxHash, oneShotIdx
  );
  console.log(`  Market: ${marketUtxo.input().transactionId()}#${marketUtxo.input().index()}`);

  // Market must be resolved
  const resolvedField = df.get(12)!.asConstrPlutusData()!;
  if (resolvedField.getAlternative() !== 1n) throw new Error("Market not resolved yet");

  // Determine winning side from datum field 13
  const winningSideField = df.get(13)!.asConstrPlutusData()!; // Some(direction)
  const innerDir = winningSideField.getData().get(0)!.asConstrPlutusData()!;
  const yesWon = innerDir.getAlternative() === 0n;
  console.log(`  Winner: ${yesWon ? "YES" : "NO"}`);

  const winningTokenName = yesWon ? Core.AssetName("594553") : Core.AssetName("4e4f");
  const winningAssetId = Core.AssetId.fromParts(policyId, winningTokenName);
  const totalWinningMinted = yesWon ? df.get(9)!.asInteger()! : df.get(10)!.asInteger()!;
  const totalAda = df.get(11)!.asInteger()!;
  const inputLovelace = marketUtxo.output().amount().coin();

  // Find how many winning tokens the wallet holds
  const walletUtxos = await provider.getUnspentOutputs(wallet.address);
  let walletTokens = 0n;
  for (const u of walletUtxos) {
    const ma = u.output().amount().multiasset();
    if (ma) walletTokens += ma.get(winningAssetId) ?? 0n;
  }
  console.log(`  Wallet has ${walletTokens} ${yesWon ? "YES" : "NO"} tokens`);

  const burnAmount = burnAmountArg ? BigInt(burnAmountArg) : walletTokens;
  if (burnAmount <= 0n) throw new Error("No winning tokens to burn");

  const payout = burnAmount * totalAda / totalWinningMinted;
  const isLastClaim = totalWinningMinted === burnAmount;
  console.log(`  Burning: ${burnAmount}, Payout: ${payout} lovelace (${Number(payout) / 1_000_000} ADA)`);
  console.log(`  Last claim: ${isLastClaim}`);

  // Claim redeemer: Claim { burn_amount } = constr(2, [burn_amount])
  const claimRedeemer = constr(2, [integer(burnAmount)]);

  // Burn: negative quantities
  const burnAssets = new Map<Core.AssetName, bigint>();
  burnAssets.set(winningTokenName, -burnAmount);
  if (isLastClaim) {
    burnAssets.set(Core.AssetName(""), -1n); // burn state thread
  }

  // Build updated datum for continuing output (not needed for last claim)
  const stateThreadAssetId = Core.AssetId.fromParts(policyId, Core.AssetName(""));

  const slotConfig = Core.SLOT_CONFIG_NETWORK[NETWORK as keyof typeof Core.SLOT_CONFIG_NETWORK]
    ?? Core.SLOT_CONFIG_NETWORK.Preprod;
  const params = await provider.getParameters();
  const uplcEvaluator = makeUplcEvaluator(params, 1.2, 1.2, slotConfig);

  let txBuilder = blaze
    .newTransaction()
    .useEvaluator(uplcEvaluator)
    .addInput(marketUtxo, claimRedeemer)
    .addMint(policyId, burnAssets, BURN_TOKENS)
    .provideScript(marketScript);

  if (!isLastClaim) {
    // Continuing output with reduced datum
    const newDatumFields = [];
    for (let i = 0; i < 14; i++) newDatumFields.push(df.get(i)!);
    // Update total_ada and winning minted count
    newDatumFields[11] = integer(totalAda - payout);
    if (yesWon) {
      newDatumFields[9] = integer(totalWinningMinted - burnAmount);
    } else {
      newDatumFields[10] = integer(totalWinningMinted - burnAmount);
    }
    const newDatum = constr(0, newDatumFields);

    const lockValue = new Core.Value(inputLovelace - payout);
    lockValue.setMultiasset(new Map([[stateThreadAssetId, 1n]]));
    txBuilder = txBuilder.lockAssets(scriptAddr, lockValue, newDatum);
  }

  let tx;
  try {
    tx = await txBuilder.complete();
  } catch (e: any) {
    console.error(`\n  Build/eval error:`, e.message ?? e);
    throw e;
  }

  console.log(`  Tx built, signing...`);
  const signed = await blaze.signTransaction(tx);
  const txCbor = signed.toCbor();
  const submitRes = await fetch(
    `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0/tx/submit`,
    {
      method: "POST",
      headers: { project_id: BLOCKFROST_API_KEY, "Content-Type": "application/cbor" },
      body: Buffer.from(txCbor, "hex"),
    }
  );
  const submitBody = await submitRes.text();
  if (!submitRes.ok) {
    console.error(`  Submit failed (${submitRes.status}): ${submitBody}`);
    throw new Error(submitBody);
  }
  console.log(`\n  Claimed: ${submitBody}`);
  console.log(`  Payout: ${Number(payout) / 1_000_000} ADA`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const command = process.argv[2] ?? "help";

async function main() {
  console.log(`  Network: ${NETWORK}`);
  console.log(`  Command: ${command}`);

  switch (command) {
    case "price":
      await cmdPrice();
      break;
    case "deploy":
      await cmdDeploy();
      break;
    case "create":
      await cmdCreate();
      break;
    case "resolve":
      await cmdResolve();
      break;
    case "bet":
      await cmdBet();
      break;
    case "claim":
      await cmdClaim();
      break;
    case "help":
    default:
      console.log(`
  Prediction Market CLI (TypeScript + Blaze)

  Commands:
    price [feed]                                              Check Pyth price
    create [feed] [ada]                                       Create market (5-min, default: BTC/USD 10 ADA)
    bet <policy> <oneshot_tx> <oneshot_idx> <yes|no> [ada]    Place bet (default: 2 ADA)
    resolve <market_tx> <idx> <policy> <oneshot_tx> <idx>     Resolve after 5 min
    claim <policy> <oneshot_tx> <oneshot_idx> [burn_amount]   Claim winnings
      `);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
