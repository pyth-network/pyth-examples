import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaAnchor } from "../target/types/solana_anchor";
import { PythLazerSolanaContract, IDL as PYTH_LAZER_SOLANA_CONTRACT_IDL } from "../fixtures/pyth_lazer_solana_contract";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { Buffer } from "buffer";
import * as assert from "assert";
import { BN } from "bn.js";

async function setupPythLazerContract(provider: anchor.AnchorProvider) {
  // Create a treasury account
  const treasury = Keypair.generate();

  const createTreasuryIx = SystemProgram.createAccount({
    fromPubkey: provider.wallet.publicKey,
    newAccountPubkey: treasury.publicKey,
    lamports: 10_000_000, // Large enough to not need to add rent
    space: 0,
    programId: SystemProgram.programId,
  });

  await provider.sendAndConfirm(
    new anchor.web3.Transaction().add(createTreasuryIx),
    [treasury]
  );

  // Initialize the contract
  const pythLazerContract = new Program<PythLazerSolanaContract>(
    PYTH_LAZER_SOLANA_CONTRACT_IDL,
    provider
  );

  await pythLazerContract.methods.initialize(provider.wallet.publicKey, treasury.publicKey).accounts({
    payer: provider.wallet.publicKey,
  }).rpc();

  // Set trusted signer for ECDSA
  const verifyingKey = Buffer.from("b8d50f0bae75bf6e03c104903d7c3afc4a6596da", "hex");

  await pythLazerContract.methods.updateEcdsaSigner(Array.from(verifyingKey), new BN(2376995919)).accounts({
    payer: provider.wallet.publicKey,
  }).rpc();

  return { pythLazerContract, treasury };
}

describe("solana-anchor", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaAnchor as Program<SolanaAnchor>;
  
  // This is a fixture taken from Lazer Staging
  const messageEcdsa = Buffer.from(
    "e4bd474dafa7d6460b9cc3ad4513b7b5007967851ab847db56e522c2d702fc1645ed57ca0f6d4f4af6643c350b54516af5ac80b321e1798f9bd8c5f5b3323b31e0ef3451011c0075d3c793e804667ed633060003010100000001001e73e130ab080000",
    "hex"
  );

  it("Initializes the program and tests updates with ECDSA message", async () => {
    const { treasury } = await setupPythLazerContract(provider);
    // Initialize Solana Anchor program with price feed id 1
    await program.methods.initialize(1).accounts({
      payer: provider.wallet.publicKey,
    }).rpc();

    // Update with ECDSA message
    await program.methods.updateEcdsa(messageEcdsa).accounts({
      payer: provider.wallet.publicKey,
      pythTreasury: treasury.publicKey,
    }).rpc();

    // Get the state
    const state = (await program.account.state.all())[0].account; // There's only one state account
    assert.equal(state.priceFeedId.toString(), "1");
    assert.equal(state.latestTimestamp.toString(), "1745846196897000");
    assert.equal(state.latestPrice.toString(), "9531352511262");
  });
});
