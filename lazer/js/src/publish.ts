import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { createEd25519Instruction } from "./ed25519.js";
import fs from "fs";

import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

const SOLANA_RPC_URL = "https://api.devnet.solana.com";
const PAYER_SECRET_KEY = Uint8Array.from(
  JSON.parse(fs.readFileSync("/path/to/secret/key.json", "utf8")) as number[]
);
// Program ID of the example contract on devnet
const PROGRAM_ID = "HU64YGK66e1wdxD83D3snGuZEvfhM4YDdYShTfQvf6nm";
// DATA PDA KEY of the example contract on devnet
const DATA_PDA_KEY = "7ndsKX3b8Jy8SScUPWvAtT4sir5JQpNrTBKxksfVVSuD";
const PYTH_LAZER_SOLANA_CONTRACT_ID =
  "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt";
const PYTH_LAZER_SOLANA_CONTRACT_STORAGE_ID =
  "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL";
const PYTH_LAZER_SOLANA_CONTRACT_TREASURY_ID =
  "opsLibxVY7Vz5eYMmSfX8cLFCFVYTtH6fr6MiifMpA7";

// Create a connection to the Solana cluster
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Load the payer's keypair
const payer = Keypair.fromSecretKey(PAYER_SECRET_KEY);

/* eslint-disable no-console */
const client = new PythLazerClient(
  "wss://pyth-lazer-staging.dourolabs.app/v1/stream",
  "{access_token}"
);

let received = false;

client.addMessageListener(async (message) => {
  // avoid processing multiple messages
  if (received) {
    return;
  }

  // received message from server
  console.log("got message:", message);

  // We are expecting a JSON messages
  if (message.type !== "json") {
    console.log("unexpected message type:", message.type);
    return;
  }

  // ignore the subscribed message
  if (message.value.type === "subscribed") {
    return;
  }

  // close the ws connection
  // we only need 1 message
  client.ws.close();

  // We are expecting a streamUpdated message
  if (message.value.type !== "streamUpdated") {
    console.log("unexpected message value type:", message.value.type);
    return;
  }

  received = true;

  // Extract the base64 encoded data
  const rawData = message.value.solana?.data;
  console.log("rawData:", rawData);

  // Decode the base64 encoded data
  const instructionMessage = Buffer.from(rawData!, "base64");
  console.log("instructionMessage:", instructionMessage);

  // Create the ed25519 instruction
  // The instruction index is 1
  // the starting offset is 9 (1 byte for the instruction index, 8 bytes for the program data)
  // the rest of the data is the message
  const ed25519Instr = createEd25519Instruction(instructionMessage, 1, 9);
  console.log("ed25519Instr:", ed25519Instr);

  // concatenate the message to the end of the instruction
  const verifyMessageData = Buffer.from([
    1,
    42,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...instructionMessage,
  ]);
  console.log("verifyMessageData:", verifyMessageData);

  // Create the verify message instruction
  const verifyMessageInstr = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      {
        pubkey: new PublicKey(DATA_PDA_KEY),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(PYTH_LAZER_SOLANA_CONTRACT_ID),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(PYTH_LAZER_SOLANA_CONTRACT_STORAGE_ID),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(PYTH_LAZER_SOLANA_CONTRACT_TREASURY_ID),
        isSigner: false,
        isWritable: true,
      },
      // system program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      // sysvar
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: new PublicKey(PROGRAM_ID),
    data: verifyMessageData,
  });
  console.log("verifyMessageInstr:", verifyMessageInstr);

  // Create the transaction
  // 1st instruction is the ed25519 instruction
  // 2nd instruction is the verify message instruction
  const transaction = new Transaction().add(ed25519Instr, verifyMessageInstr);
  console.log("transaction:", transaction);

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    {
      skipPreflight: true,
    }
  );

  console.log("Transaction confirmed with signature:", signature);
});

client.ws.addEventListener("open", () => {
  client.send({
    type: "subscribe",
    subscriptionId: 1,
    // Example contract receives ETH/USD price
    priceFeedIds: [2],
    properties: ["price"],
    chains: ["solana"],
    deliveryFormat: "json",
    channel: "real_time",
    jsonBinaryEncoding: "base64",
  });
});
