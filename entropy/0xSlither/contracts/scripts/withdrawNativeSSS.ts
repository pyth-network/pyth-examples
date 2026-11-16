import { ethers } from "hardhat";

/**
 * Script to withdraw native SSS tokens from a contract to the server wallet
 * This retrieves any native SSS (chain native token) that is held by a contract
 * Use this for contracts like StakeArena that hold native SSS
 */
async function main() {
  // Get contract address from command line or environment variable
  const contractAddress = process.argv[2] || process.env.STAKE_ARENA_ADDRESS;
  
  if (!contractAddress) {
    console.error("Usage: npx hardhat run scripts/withdrawNativeSSS.ts --network saga -- <contract_address>");
    console.error("Or set STAKE_ARENA_ADDRESS in .env");
    process.exit(1);
  }

  // Validate address
  if (!ethers.isAddress(contractAddress)) {
    console.error("Invalid contract address:", contractAddress);
    process.exit(1);
  }

  // Get the signer (server wallet)
  const signers = await ethers.getSigners();
  const signer = signers[0];
  const serverWallet = signer.address;

  console.log("=".repeat(60));
  console.log("Withdrawing Native SSS from Contract");
  console.log("=".repeat(60));
  console.log("Contract Address:", contractAddress);
  console.log("Server Wallet:", serverWallet);
  console.log("");

  // Check the native SSS balance of the contract
  const provider = ethers.provider;
  const contractBalance = await provider.getBalance(contractAddress);
  const contractBalanceFormatted = ethers.formatEther(contractBalance);

  console.log(`Contract Native SSS Balance: ${contractBalanceFormatted} SSS`);
  console.log("");

  if (contractBalance === 0n) {
    console.log("⚠️  No native SSS tokens to withdraw from the contract");
    console.log("=".repeat(60));
    return;
  }

  // Get server wallet balance before
  const serverBalanceBefore = await provider.getBalance(serverWallet);
  console.log(`Server Wallet Balance (before): ${ethers.formatEther(serverBalanceBefore)} SSS`);
  console.log("");

  // To withdraw native tokens, we need to call a withdrawal function on the contract
  // For StakeArena, there's no explicit withdrawal function, but the owner can receive funds
  // Let's try to send a transaction that triggers the receive() function
  
  console.log(`Attempting to withdraw ${contractBalanceFormatted} SSS...`);
  console.log("");
  
  try {
    // Method 1: If contract has a withdraw function (you may need to add this to your contract)
    // For now, we'll just show the balance and provide instructions
    
    console.log("⚠️  IMPORTANT: Contract Withdrawal Method Needed");
    console.log("=".repeat(60));
    console.log("");
    console.log("The contract holds native SSS but doesn't have a withdrawal function.");
    console.log("To withdraw these funds, you have two options:");
    console.log("");
    console.log("Option 1: Add a withdrawal function to your contract");
    console.log("Add this function to StakeArena.sol:");
    console.log("");
    console.log("    function withdrawBalance() external onlyOwner {");
    console.log("        uint256 balance = address(this).balance;");
    console.log("        require(balance > 0, \"No balance to withdraw\");");
    console.log("        (bool success, ) = payable(owner()).call{value: balance}(\"\");");
    console.log("        require(success, \"Transfer failed\");");
    console.log("    }");
    console.log("");
    console.log("Option 2: Use low-level call (attempting now...)");
    console.log("");

    // Method 2: Try to use a low-level call to trigger receive() or fallback()
    // This will only work if the contract has logic to send funds back
    
    // Create a simple contract interface with owner() function
    const contractWithOwner = new ethers.Contract(
      contractAddress,
      [
        "function owner() view returns (address)",
        "function withdrawBalance() external"
      ],
      signer
    );

    // Check if we're the owner
    try {
      const owner = await contractWithOwner.owner();
      console.log(`Contract Owner: ${owner}`);
      
      if (owner.toLowerCase() !== serverWallet.toLowerCase()) {
        console.log("❌ You are not the contract owner!");
        console.log("   Only the owner can withdraw funds.");
        process.exit(1);
      }
    } catch (error) {
      console.log("⚠️  Could not verify ownership - proceeding anyway...");
    }

    // Try to call withdrawBalance function if it exists
    console.log("Attempting to call withdrawBalance()...");
    const tx = await contractWithOwner.withdrawBalance();
    console.log("Transaction submitted:", tx.hash);
    
    await tx.wait();
    console.log("✅ Withdrawal successful!");
    console.log("");

    // Verify balances after withdrawal
    const newContractBalance = await provider.getBalance(contractAddress);
    const serverBalanceAfter = await provider.getBalance(serverWallet);
    
    console.log("=".repeat(60));
    console.log("Final Balances:");
    console.log("=".repeat(60));
    console.log(`Contract Balance: ${ethers.formatEther(newContractBalance)} SSS`);
    console.log(`Server Wallet Balance: ${ethers.formatEther(serverBalanceAfter)} SSS`);
    console.log(`Amount Withdrawn: ${ethers.formatEther(serverBalanceAfter - serverBalanceBefore)} SSS`);
    console.log("=".repeat(60));

  } catch (error: any) {
    console.log("");
    console.log("❌ Withdrawal function not found or failed:", error.message);
    console.log("");
    console.log("=".repeat(60));
    console.log("Next Steps:");
    console.log("=".repeat(60));
    console.log("1. Add a withdrawBalance() function to your contract (see above)");
    console.log("2. Redeploy the contract or upgrade it if using a proxy pattern");
    console.log("3. Run this script again");
    console.log("");
    console.log("Current Holdings:");
    console.log(`  Contract: ${contractBalanceFormatted} SSS (locked)`);
    console.log(`  Server Wallet: ${ethers.formatEther(serverBalanceBefore)} SSS`);
    console.log("=".repeat(60));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

