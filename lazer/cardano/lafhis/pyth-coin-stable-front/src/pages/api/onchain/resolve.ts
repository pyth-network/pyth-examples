/**
 * POST /api/onchain/resolve
 *
 * Backend-only resolve step. Called after the duel deadline passes.
 * Fetches final Pyth Lazer prices, determines winner, builds + signs + submits
 * the resolve transaction.
 *
 * Body: { gameId: string }
 * Returns: { txHash: string } | { error: string }
 */

import type { NextApiRequest, NextApiResponse } from "next";
import {
  BlockfrostProvider,
  MeshWallet,
  MeshTxBuilder,
  resolveScriptHash,
  applyParamsToScript,
  mConStr1,
  resolveSlotNo,
  ForgeScript,
} from "@meshsdk/core";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { bech32 } from "bech32";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getSession } from "@/server/gameStore";

type ResolveResponse = { txHash: string } | { error: string };

// ─── CBOR helpers ────────────────────────────────────────────────────────────

const cborBytesParam = (hex: string) => {
  const len = hex.length / 2;
  if (len < 24) return (0x40 | len).toString(16).padStart(2, "0") + hex;
  if (len < 256) return "58" + len.toString(16).padStart(2, "0") + hex;
  return (
    "59" +
    (len >> 8).toString(16).padStart(2, "0") +
    (len & 0xff).toString(16).padStart(2, "0") +
    hex
  );
};

// Encode Resolve { timestamp } redeemer: Constr 1 [I n]  → d87a 81 <cbor-uint>
// MeshJS has issues serialising large integers via mConStr1, so we build CBOR manually.
function cborConstr1Int(n: number): string {
  const buf: number[] = [0xd8, 0x7a, 0x81]; // tag(122) array(1)
  const big = BigInt(n);
  const B = (x: number) => BigInt(x);
  if (big <= B(0x17)) {
    buf.push(Number(big));
  } else if (big <= B(0xff)) {
    buf.push(0x18, Number(big));
  } else if (big <= B(0xffff)) {
    buf.push(0x19, Number(big >> B(8)), Number(big & B(0xff)));
  } else if (big <= B(0xffffffff)) {
    buf.push(
      0x1a,
      Number((big >> B(24)) & B(0xff)),
      Number((big >> B(16)) & B(0xff)),
      Number((big >> B(8)) & B(0xff)),
      Number(big & B(0xff)),
    );
  } else {
    buf.push(
      0x1b,
      Number((big >> B(56)) & B(0xff)),
      Number((big >> B(48)) & B(0xff)),
      Number((big >> B(40)) & B(0xff)),
      Number((big >> B(32)) & B(0xff)),
      Number((big >> B(24)) & B(0xff)),
      Number((big >> B(16)) & B(0xff)),
      Number((big >> B(8)) & B(0xff)),
      Number(big & B(0xff)),
    );
  }
  return Buffer.from(buf).toString("hex");
}

// ─── Address helpers ──────────────────────────────────────────────────────────

function pkhToAddress(pkh: string, networkId = 0): string {
  // Enterprise address (payment key only): header 0x60 on testnet, 0x61 on mainnet
  const header = networkId === 0 ? 0x60 : 0x61;
  const bytes = Buffer.concat([Buffer.from([header]), Buffer.from(pkh, "hex")]);
  return bech32.encode(networkId === 0 ? "addr_test" : "addr", bech32.toWords(bytes), 200);
}

function scriptHashToRewardAddress(hash: string, networkId = 0): string {
  const header = networkId === 0 ? 0xf0 : 0xf1;
  const bytes = Buffer.concat([Buffer.from([header]), Buffer.from(hash, "hex")]);
  return bech32.encode(networkId === 0 ? "stake_test" : "stake", bech32.toWords(bytes), 200);
}

function utf8ToHex(value: string): string {
  return Buffer.from(value, "utf-8").toString("hex");
}

// ─── Pyth helpers ─────────────────────────────────────────────────────────────

async function resolvePythState(blockfrostId: string, pythPolicyId: string) {
  const base = "https://cardano-preprod.blockfrost.io/api/v0";
  const headers = { project_id: blockfrostId };
  const unit = pythPolicyId + utf8ToHex("Pyth State");

  const addrRes = await fetch(`${base}/assets/${unit}/addresses`, { headers });
  if (!addrRes.ok) throw new Error(`Pyth state lookup: ${await addrRes.text()}`);
  const [first] = (await addrRes.json()) as Array<{ address: string }>;
  if (!first?.address) throw new Error("Pyth state address not found");

  const utxoRes = await fetch(`${base}/addresses/${first.address}/utxos/${unit}`, { headers });
  if (!utxoRes.ok) throw new Error(`Pyth UTxO lookup: ${await utxoRes.text()}`);
  const utxos = (await utxoRes.json()) as Array<{
    tx_hash: string;
    output_index: number;
    data_hash?: string;
  }>;
  const stateUtxo = utxos[0];
  if (!stateUtxo) throw new Error("Pyth state UTxO not found");

  let datum: unknown;
  if (stateUtxo.data_hash) {
    const r = await fetch(`${base}/scripts/datum/${stateUtxo.data_hash}`, { headers });
    if (r.ok) datum = ((await r.json()) as { json_value?: unknown }).json_value;
  }
  if (!datum) {
    const r = await fetch(`${base}/txs/${stateUtxo.tx_hash}/utxos`, { headers });
    const d = (await r.json()) as {
      outputs?: Array<{ output_index: number; inline_datum?: unknown }>;
    };
    datum = d.outputs?.find((o) => o.output_index === stateUtxo.output_index)?.inline_datum;
  }
  if (!datum) throw new Error("Pyth state datum not found");

  const fields = (
    datum as { fields?: Array<{ bytes?: string }> }
  ).fields ?? (datum as { constructor?: { fields?: Array<{ bytes?: string }> } }).constructor?.fields;
  if (!fields || fields.length < 4 || !fields[3]?.bytes) throw new Error("Bad Pyth datum shape");

  const withdrawScriptHash = fields[3].bytes;
  const scriptRes = await fetch(`${base}/scripts/${withdrawScriptHash}/cbor`, { headers });
  if (!scriptRes.ok) throw new Error(`Pyth script CBOR: ${await scriptRes.text()}`);
  const { cbor } = (await scriptRes.json()) as { cbor?: string };
  if (!cbor) throw new Error("Missing Pyth script CBOR");

  return {
    txHash: stateUtxo.tx_hash,
    txIndex: stateUtxo.output_index,
    withdrawScriptHash,
    scriptSize: cbor.length / 2,
  };
}

async function fetchSignedPrices(feedIds: number[], pythToken: string) {
  const client = await PythLazerClient.create({ token: pythToken, webSocketPoolConfig: {} });
  try {
    const resp = await client.getLatestPrice({
      priceFeedIds: feedIds,
      properties: ["price", "exponent"],
      channel: "fixed_rate@200ms",
      formats: ["solana"],
      jsonBinaryEncoding: "hex",
      parsed: true,
    });
    if (!resp.solana?.data) throw new Error("No Pyth Lazer signed update");
    return {
      signedUpdateHex: resp.solana.data as string,
      parsedPrices: (resp.parsed?.priceFeeds ?? []).map(
        (f: { priceFeedId: number; price?: string | number; exponent?: string | number }) => ({
          feedId: Number(f.priceFeedId),
          price: Number(f.price ?? 0),
          exponent: Number(f.exponent ?? 0),
        }),
      ),
    };
  } finally {
    client.shutdown();
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResolveResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameId } = req.body ?? {};
  if (!gameId || typeof gameId !== "string") {
    return res.status(400).json({ error: "gameId is required" });
  }

  const blockfrostId = process.env.BLOCKFROST_ID;
  const mnemonic = process.env.MNEMONIC;
  const pythToken = process.env.PYTH_TOKEN;
  const backendPkh = process.env.BACKEND_PKH;
  const pythPolicyId = process.env.PYTH_POLICY_ID;

  if (!blockfrostId || !mnemonic || !pythToken || !backendPkh || !pythPolicyId) {
    return res.status(500).json({ error: "Missing server env vars" });
  }

  // Load game state
  const game = getSession(gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });

  const {
    onchain: {
      depositBTxHash,
      duelId,
      playerOnePkh,
      playerTwoPkh,
      playerOneFeedId,
      playerTwoFeedId,
      startPriceA,
      startPriceB,
      deadlinePosix,
    },
    config: { betAda },
  } = game;

  if (
    !depositBTxHash ||
    !duelId ||
    !playerOnePkh ||
    !playerTwoPkh ||
    playerOneFeedId == null ||
    playerTwoFeedId == null ||
    startPriceA == null ||
    startPriceB == null ||
    deadlinePosix == null
  ) {
    return res.status(400).json({ error: "Game is missing on-chain data (depositB not complete?)" });
  }

  if (Date.now() < deadlinePosix) {
    const remaining = Math.ceil((deadlinePosix - Date.now()) / 1000);
    return res.status(400).json({ error: `Deadline not reached yet. ${remaining}s remaining.` });
  }

  try {
    // Load plutus.json
    const plutusPath = path.resolve(process.cwd(), "../pyth-coin-stable-validators/plutus.json");
    const plutus = JSON.parse(readFileSync(plutusPath, "utf8")) as {
      validators: Array<{ title: string; compiledCode: string }>;
    };
    const getCode = (title: string) => {
      const code = plutus.validators.find((v) => v.title === title)?.compiledCode;
      if (!code) throw new Error(`Missing compiled code: ${title}`);
      return code;
    };

    // Derive scripts
    const mintScriptCbor = applyParamsToScript(
      getCode("nft.nft_policy.mint"),
      [cborBytesParam(backendPkh)],
      "CBOR",
    );
    const mintPolicyId = resolveScriptHash(mintScriptCbor, "V3");
    const spendScriptCbor = applyParamsToScript(
      getCode("validators.bet.spend"),
      [cborBytesParam(backendPkh), cborBytesParam(mintPolicyId), cborBytesParam(pythPolicyId)],
      "CBOR",
    );

    // Setup backend wallet
    const provider = new BlockfrostProvider(blockfrostId);
    const wallet = new MeshWallet({
      networkId: 0,
      fetcher: provider,
      submitter: provider,
      key: { type: "mnemonic", words: mnemonic.split(" ") },
    });

    const backendAddress = (await wallet.getUsedAddresses())[0];
    if (!backendAddress) throw new Error("Backend wallet has no addresses");
    const utxos = await wallet.getUtxos();
    if (!utxos.length) throw new Error("Backend wallet has no UTxOs");

    // Resolve Pyth state and fetch final prices
    const pythState = await resolvePythState(blockfrostId, pythPolicyId);
    const pythRewardAddr = scriptHashToRewardAddress(pythState.withdrawScriptHash, 0);

    const { signedUpdateHex, parsedPrices } = await fetchSignedPrices(
      [playerOneFeedId, playerTwoFeedId],
      pythToken,
    );
    const endA = parsedPrices.find((p) => p.feedId === playerOneFeedId)?.price;
    const endB = parsedPrices.find((p) => p.feedId === playerTwoFeedId)?.price;
    if (endA == null || endB == null) throw new Error("Missing final price data");

    // Determine winner (same formula as the validator)
    const changeA = Math.trunc(((endA - startPriceA) * 1_000_000) / startPriceA);
    const changeB = Math.trunc(((endB - startPriceB) * 1_000_000) / startPriceB);
    const isDraw = Math.abs(changeA - changeB) < 1;

    console.log(`[resolve] changeA=${changeA} changeB=${changeB} isDraw=${isDraw}`);

    const betLovelace = Math.round(betAda * 1_000_000);
    const totalPot = betLovelace * 2;

    // Winner token — simple ForgeScript locked to backend wallet
    const forgingScript = ForgeScript.withOneSignature(backendAddress);
    const winnerPolicyId = resolveScriptHash(forgingScript);
    const WINNER_TOKEN_NAME = Buffer.from("horseshoe", "utf-8").toString("hex");

    const resolveRedeemerCbor = cborConstr1Int(deadlinePosix);
    const burnRedeemer = mConStr1([]);
    const nowSlot = resolveSlotNo("preprod", Date.now());

    // Find pure-ADA UTxO for collateral
    const collateral = utxos.find(
      (u) => u.output.amount.length === 1 && u.output.amount[0]?.unit === "lovelace",
    );
    if (!collateral) throw new Error("Backend wallet has no pure-ADA UTxO for collateral");

    const tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });

    tx
      .invalidBefore(Number(nowSlot) - 600)
      .invalidHereafter(Number(nowSlot) + 600)
      .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
      .requiredSignerHash(backendPkh)

      // Pyth zero-withdrawal
      .withdrawalPlutusScriptV3()
      .withdrawal(pythRewardAddr, "0")
      .withdrawalTxInReference(
        pythState.txHash,
        pythState.txIndex,
        String(pythState.scriptSize),
        pythState.withdrawScriptHash,
      )
      .withdrawalRedeemerValue([signedUpdateHex], "Mesh", {
        mem: 10_000_000,
        steps: 6_000_000_000,
      })

      // Spend Active UTxO
      .spendingPlutusScriptV3()
      .txIn(depositBTxHash, 0)
      .txInInlineDatumPresent()
      .txInRedeemerValue(resolveRedeemerCbor, "CBOR", { mem: 5_000_000, steps: 2_000_000_000 })
      .txInScript(spendScriptCbor)

      // Burn the authenticity NFT
      .mintPlutusScriptV3()
      .mint("-1", mintPolicyId, duelId)
      .mintingScript(mintScriptCbor)
      .mintRedeemerValue(burnRedeemer, "Mesh", { mem: 1_000_000, steps: 1_000_000_000 });

    if (isDraw) {
      tx
        .txOut(pkhToAddress(playerOnePkh), [{ unit: "lovelace", quantity: String(betLovelace) }])
        .txOut(pkhToAddress(playerTwoPkh), [{ unit: "lovelace", quantity: String(betLovelace) }]);
    } else {
      const winnerPkh = changeA > changeB ? playerOnePkh : playerTwoPkh;
      tx
        .mint("1", winnerPolicyId, WINNER_TOKEN_NAME)
        .mintingScript(forgingScript)
        .txOut(pkhToAddress(winnerPkh), [
          { unit: "lovelace", quantity: String(totalPot) },
          { unit: winnerPolicyId + WINNER_TOKEN_NAME, quantity: "1" },
        ]);
    }

    tx.changeAddress(backendAddress).selectUtxosFrom(utxos);

    console.log("[resolve] building transaction...");
    const unsigned = await tx.complete();
    const signed = await wallet.signTx(unsigned);
    const txHash = await wallet.submitTx(signed);

    console.log(`[resolve] tx submitted: ${txHash}`);
    return res.status(200).json({ txHash });
  } catch (err) {
    console.error("[resolve] error:", err);
    const message = err instanceof Error ? err.message : "Resolve failed";
    return res.status(500).json({ error: message });
  }
}
