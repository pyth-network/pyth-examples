import { ethers } from "ethers";
import hre from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  const ENTROPY_ADDRESS = "0x549ebba8036ab746611b4ffa1423eb0a4df61440"; // Arbitrum Entropy
  const DEFAULT_PROVIDER = "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344";
  const PYUSD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PYUSD_TOKEN_ADDRESS; // Mock PYUSD on Arbitrum Sepolia
  const FUNDING_AMOUNT = ethers.parseEther("0.001"); // ETH to seed each new raffle

  // Validate environment variables
  if (!PYUSD_TOKEN_ADDRESS) {
    throw new Error("PYUSD_TOKEN_ADDRESS environment variable is not set");
  }
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is not set");
  }
  if (!process.env.RPC) {
    throw new Error("RPC environment variable is not set");
  }

  console.log("Deployment Configuration:");
  console.log("- Entropy Address:", ENTROPY_ADDRESS);
  console.log("- Default Provider:", DEFAULT_PROVIDER);
  console.log("- PYUSD Token Address:", PYUSD_TOKEN_ADDRESS);

  // Get the contract artifact
  const contractArtifact = await hre.artifacts.readArtifact("RaffleFactory");
  
  // Create a provider and signer for hardhat network
  const provider = new ethers.JsonRpcProvider(process.env.RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
  
  // Create contract factory using ethers directly
  const RaffleFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    signer
  );
  
  console.log("\nDeploying RaffleFactory...");
  
  try {
    const factory = await RaffleFactory.deploy(
      ENTROPY_ADDRESS,
      DEFAULT_PROVIDER,
      PYUSD_TOKEN_ADDRESS,
      FUNDING_AMOUNT
    );

    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log("\n✅ Deployment Successful!");
    console.log("RaffleFactory deployed to:", factoryAddress);
    console.log("PYUSD Token Address:", PYUSD_TOKEN_ADDRESS);
    console.log("Funding amount:", ethers.formatEther(FUNDING_AMOUNT), "ETH");
    
    console.log("\n📋 Next Steps:");
    console.log("1. Update your .env.local file with:");
    console.log(`   NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
    console.log("2. Fund the factory with ETH for raffle creation");
    console.log("3. Test creating a raffle with startTime");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});