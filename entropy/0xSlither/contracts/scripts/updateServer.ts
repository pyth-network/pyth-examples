import { ethers } from "hardhat";

async function main() {
  const stakeArenaAddress = process.env.STAKE_ARENA_ADDRESS;
  const serverAddress = process.env.SERVER_ADDRESS;

  if (!stakeArenaAddress || !serverAddress) {
    console.error("Please set STAKE_ARENA_ADDRESS and SERVER_ADDRESS in .env");
    process.exit(1);
  }

  console.log("Updating authorized server...");
  console.log("StakeArena:", stakeArenaAddress);
  console.log("New Server:", serverAddress);

  const StakeArena = await ethers.getContractAt("StakeArena", stakeArenaAddress);
  
  const tx = await StakeArena.updateAuthorizedServer(serverAddress);
  console.log("Transaction submitted:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);
  console.log("✅ Authorized server updated successfully!");

  // Verify the update
  try {
    // Small delay to ensure state is updated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const currentServer = await StakeArena.authorizedServer();
    console.log("Current authorized server:", currentServer);
    
    if (currentServer.toLowerCase() === serverAddress.toLowerCase()) {
      console.log("✓ Verification successful - server address matches!");
    } else {
      console.warn("⚠ Warning: Server address doesn't match expected value");
    }
  } catch (error: any) {
    console.warn("⚠ Could not verify server address (this is okay if the transaction succeeded)");
    console.warn("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

