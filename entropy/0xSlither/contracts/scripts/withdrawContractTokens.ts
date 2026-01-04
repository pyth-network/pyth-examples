import { ethers } from "hardhat";

/**
 * Script to withdraw SSS tokens from the GameToken contract to the server wallet
 * This retrieves any SSS tokens that are held by the GameToken contract itself
 */
async function main() {
  const gameTokenAddress = process.env.GAME_TOKEN_ADDRESS;
  
  if (!gameTokenAddress) {
    console.error("Please set GAME_TOKEN_ADDRESS in .env");
    process.exit(1);
  }

  // Get the signer (server wallet)
  const signers = await ethers.getSigners();
  const signer = signers[0];
  const serverWallet = signer.address;

  console.log("=".repeat(60));
  console.log("Withdrawing SSS tokens from GameToken contract");
  console.log("=".repeat(60));
  console.log("GameToken Contract:", gameTokenAddress);
  console.log("Server Wallet:", serverWallet);
  console.log("");

  // Connect to the GameToken contract
  const GameToken = await ethers.getContractAt("GameToken", gameTokenAddress);

  // Check the balance of SSS tokens held by the contract itself
  const contractBalance = await GameToken.balanceOf(gameTokenAddress);
  const contractBalanceFormatted = ethers.formatEther(contractBalance);

  console.log(`Contract SSS Balance: ${contractBalanceFormatted} SSS`);
  console.log("");

  if (contractBalance === 0n) {
    console.log("⚠️  No SSS tokens to withdraw from the contract");
    console.log("=".repeat(60));
    return;
  }

  // Transfer all SSS tokens from the contract to the server wallet
  console.log(`Transferring ${contractBalanceFormatted} SSS to server wallet...`);
  
  try {
    // Use transfer function to send tokens from contract to server wallet
    // Note: This requires the server wallet to be the owner of the contract
    // or have appropriate permissions
    const tx = await GameToken.transfer(serverWallet, contractBalance);
    console.log("Transaction submitted:", tx.hash);
    
    await tx.wait();
    console.log("✅ Transfer successful!");
    console.log("");

    // Verify balances after transfer
    const newContractBalance = await GameToken.balanceOf(gameTokenAddress);
    const serverBalance = await GameToken.balanceOf(serverWallet);
    
    console.log("=".repeat(60));
    console.log("Final Balances:");
    console.log("=".repeat(60));
    console.log(`Contract Balance: ${ethers.formatEther(newContractBalance)} SSS`);
    console.log(`Server Wallet Balance: ${ethers.formatEther(serverBalance)} SSS`);
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("❌ Transfer failed:", error.message);
    
    // Provide helpful error messages
    if (error.message.includes("insufficient balance")) {
      console.log("\n⚠️  The contract doesn't have enough SSS tokens");
    } else if (error.message.includes("transfer amount exceeds balance")) {
      console.log("\n⚠️  Transfer amount exceeds the contract's balance");
    } else {
      console.log("\n💡 Make sure the server wallet has permission to withdraw from the contract");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

