import * as anchor from "@coral-xyz/anchor";
import yargs from "yargs/yargs";
import { readFileSync } from "fs";
import {
  sendAndConfirmTransaction,
  SendTransactionError,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  createEd25519Instruction,
  PYTH_LAZER_SOLANA_CONTRACT_IDL,
  type PythLazerSolanaContract,
} from "@pythnetwork/pyth-lazer-solana-sdk";

/*
    Example:
    pnpm run start:verify_ed25519_message \
        --url 'https://api.testnet.solana.com'\
        --keypair-path './keypair.json' \
        --message "b9011a82f3c5c2760beb0c78827c75b0b18f1d4a2dcddf9d3efb291e66de25927538deffd74606de833eff236022aaca7b8a79cf15d3c7b51a91b500b2b9e6ca64bcfa03f65210bee4fcf5b1cee1e537fabcfd95010297653b94af04d454fc473e94834f1c0075d3c793c03c26adb03706000301010000000100aa749416b4090000"
*/

async function main() {
  let argv = await yargs(process.argv.slice(2))
    .options({
      url: { type: "string", demandOption: true },
      "keypair-path": { type: "string", demandOption: true },
      message: { type: "string", demandOption: true },
    })
    .parse();

  const keypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(argv.keypairPath, "ascii"))),
  );

  const connection = new anchor.web3.Connection(argv.url, {
    commitment: "confirmed",
  });

  const provider = new anchor.AnchorProvider(connection, {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => {
      if ("version" in tx) {
        tx.sign([keypair]);
        return tx;
      } else {
        tx.partialSign(keypair);
        return tx;
      }
    },
    signAllTransactions: async (txs) => {
      return txs.map((t) => {
        if ("version" in t) {
          t.sign([keypair]);
          return t;
        } else {
          t.partialSign(keypair);
          return t;
        }
      });
    },
  });

  const program: anchor.Program<PythLazerSolanaContract> = new anchor.Program(
    PYTH_LAZER_SOLANA_CONTRACT_IDL,
    provider,
  );

  const instructionMessage = Buffer.from(argv.message, "hex");
  const ed25519Instruction = createEd25519Instruction(
    instructionMessage,
    1,
    12,
  );
  const lazerInstruction = await program.methods
    .verifyMessage(instructionMessage, 0, 0)
    .accounts({
      payer: provider.wallet.publicKey,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .instruction();

  const transaction = new Transaction().add(
    ed25519Instruction,
    lazerInstruction,
  );
  console.log("transaction:", transaction);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair],
      {
        skipPreflight: true,
      },
    );
    console.log("Transaction confirmed with signature:", signature);
  } catch (e) {
    console.log("error", e);
    if (e instanceof SendTransactionError) {
      console.log(await e.getLogs(connection));
    }
  }
}

main();
