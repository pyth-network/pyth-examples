import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Deploy EntropyOracle contract to Base Sepolia
 * This contract interfaces with Pyth Entropy for cross-chain randomness
 */
async function main() {
  console.log("🎲 Deploying EntropyOracle to Base Sepolia...\n");

  // Pyth Entropy V2 contract address on Base Sepolia
  // Source: https://docs.pyth.network/entropy/contract-addresses
  // Updated address from Pyth documentation
  const PYTH_ENTROPY_ADDRESS = "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c";
  
  console.log("📍 Using Pyth Entropy at:", PYTH_ENTROPY_ADDRESS);
  console.log("🌐 Network: Base Sepolia (Chain ID: 84532)");
  console.log();

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);

  // Get deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    console.error("❌ Deployer has no ETH balance");
    process.exit(1);
  }

  // Get authorized server address
  const authorizedServer = process.env.SERVER_WALLET_ADDRESS || deployer.address;
  console.log("🔐 Authorized server:", authorizedServer);
  console.log("🎲 Pyth Entropy contract:", PYTH_ENTROPY_ADDRESS);
  console.log();

  // Deploy EntropyOracle
  console.log("Deploying EntropyOracle...");
  const EntropyOracle = await ethers.getContractFactory("EntropyOracle");
  const entropyOracle = await EntropyOracle.deploy(
    PYTH_ENTROPY_ADDRESS,
    authorizedServer
  );

  await entropyOracle.waitForDeployment();
  const entropyOracleAddress = await entropyOracle.getAddress();

  console.log("✅ EntropyOracle deployed to:", entropyOracleAddress);
  console.log();

  // Get entropy provider info (with error handling)
  try {
    const entropyProvider = await entropyOracle.entropyProvider();
    console.log("🎲 Entropy provider:", entropyProvider);

    // Get current entropy fee
    const fee = await entropyOracle.getEntropyFee();
    console.log("💰 Current entropy fee:", ethers.formatEther(fee), "ETH");
  } catch (error) {
    console.warn("⚠️  Could not read entropy provider (contract may need to initialize)");
    console.warn("This is normal if the Pyth Entropy contract needs setup");
  }
  console.log();

  // Save deployment info
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    entropyOracle: entropyOracleAddress,
    pythEntropy: PYTH_ENTROPY_ADDRESS,
    authorizedServer: authorizedServer,
    entropyProvider: entropyProvider,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, "entropyOracle-baseSepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to:", deploymentPath);

  // Print environment variable update instructions
  console.log("\n✅ Deployment complete!");
  console.log("\n📝 Add these to your .env file:");
  console.log("─".repeat(60));
  console.log(`BASE_SEPOLIA_RPC_URL=https://sepolia.base.org`);
  console.log(`BASE_SEPOLIA_CHAIN_ID=84532`);
  console.log(`PYTH_ENTROPY_ADDRESS=${PYTH_ENTROPY_ADDRESS}`);
  console.log(`ENTROPY_ORACLE_ADDRESS=${entropyOracleAddress}`);
  console.log(`SERVER_WALLET_ADDRESS=${authorizedServer}`);
  console.log("─".repeat(60));

  console.log("\n🔗 View on Base Sepolia Explorer:");
  console.log(`https://sepolia.basescan.org/address/${entropyOracleAddress}`);

  console.log("\n⚠️  IMPORTANT:");
  console.log("1. Fund the server wallet with ETH for entropy requests");
  console.log("2. Each entropy request costs approximately:", ethers.formatEther(fee), "ETH");
  console.log("3. Update your server's .env with the above values");
  console.log("4. Verify the contract on BaseScan for transparency");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

