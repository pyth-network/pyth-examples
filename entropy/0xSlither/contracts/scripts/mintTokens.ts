import { ethers } from "hardhat";

async function main() {
  const gameTokenAddress = process.env.GAME_TOKEN_ADDRESS;
  
  if (!gameTokenAddress) {
    console.error("Please set GAME_TOKEN_ADDRESS in .env");
    process.exit(1);
  }

  // Get recipient from command line or use default
  const recipientAddress = process.argv[2];
  const amount = process.argv[3] || "1000";

  if (!recipientAddress) {
    console.error("Usage: npx hardhat run scripts/mintTokens.ts --network saga -- <recipient> [amount]");
    process.exit(1);
  }

  console.log("Minting tokens...");
  console.log("GameToken:", gameTokenAddress);
  console.log("Recipient:", recipientAddress);
  console.log("Amount:", amount, "SSS");

  const GameToken = await ethers.getContractAt("GameToken", gameTokenAddress);
  const amountWei = ethers.parseEther(amount);
  
  const tx = await GameToken.mint(recipientAddress, amountWei);
  console.log("Transaction submitted:", tx.hash);
  
  await tx.wait();
  console.log("✅ Tokens minted successfully!");

  // Verify balance
  const balance = await GameToken.balanceOf(recipientAddress);
  console.log("New balance:", Math.floor(parseFloat(ethers.formatEther(balance))), "SSS");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

