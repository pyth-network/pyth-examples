import { ethers } from "hardhat";

async function main() {
  console.log("Deploying 0xSlither contracts to Saga Chainlet...");
  console.log("Using native SSS token for game economy\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", Math.floor(parseFloat(ethers.formatEther(balance))), "SSS");

  // Deploy StakeArena (no GameToken needed!)
  console.log("\n1. Deploying StakeArena...");
  const StakeArena = await ethers.getContractFactory("StakeArena");
  const stakeArena = await StakeArena.deploy(deployer.address);
  await stakeArena.waitForDeployment();
  const stakeArenaAddress = await stakeArena.getAddress();
  console.log("StakeArena deployed to:", stakeArenaAddress);

  // Verify deployment
  console.log("\n2. Verifying deployment...");
  const authorizedServer = await stakeArena.authorizedServer();
  console.log(`StakeArena authorized server: ${authorizedServer}`);

  // Save deployment addresses
  console.log("\n3. Deployment Summary:");
  console.log("=======================");
  console.log(`StakeArena: ${stakeArenaAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Token: Native SSS`);
  console.log(`Total SSS in circulation: 1000 SSS`);
  console.log("\nSave this address in your .env files:");
  console.log(`STAKE_ARENA_ADDRESS=${stakeArenaAddress}`);
  console.log("\nNote: Players will stake native SSS directly (no token approval needed!)");
  console.log("\nUpdate authorizedServer by calling:");
  console.log("stakeArena.updateAuthorizedServer(<your-server-address>)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


