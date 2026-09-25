import * as anchor from "@coral-xyz/anchor";
import yargs from "yargs/yargs";
import { readFileSync } from "fs";
import {
  PYTH_LAZER_SOLANA_CONTRACT_IDL,
  type PythLazerSolanaContract,
} from "@pythnetwork/pyth-lazer-solana-sdk";

/*
  Example:
  pnpm run start:verify_ecdsa_message \
    --url 'https://api.devnet.solana.com' \
    --keypair-path './keypair.json' \
    --message "e4bd474dda8934550d660e6ef4ee6ec1557349e283090c0107cad8bb997e67783a68be5646a5c949a8deaa6bee6ec1fc8aceb5002d6808b1da8ce5e9d26fd1b56ebeaf9d001c0075d3c793403ab1a9b03706000301010000000100eaf83297b5090000"
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

  await program.methods
    .verifyEcdsaMessage(Buffer.from(argv.message, "hex"))
    .accounts({
      payer: provider.wallet.publicKey,
    })
    .rpc();

  console.log("message is valid");
}

main();
