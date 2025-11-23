import { ethers } from "hardhat";
import { ADDRESSES } from "../config/addresses";

/**
 * Deploy solo PythIntegration aggiornato
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== Deploy Solo PythIntegration ===\n");
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Get network
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "baseSepolia" : 
                      network.chainId === 8453n ? "base" : 
                      "unknown";
  
  console.log("Network:", networkName);

  const addresses = ADDRESSES[networkName as keyof typeof ADDRESSES];
  if (!addresses) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  console.log("\n📋 Configuration:");
  console.log("  Pyth Entropy:", addresses.pythEntropy);

  console.log("\n=== Deploying PythIntegration ===");
  const PythIntegration = await ethers.getContractFactory("PythIntegration");
  const pythIntegration = await PythIntegration.deploy(addresses.pythEntropy);
  await pythIntegration.waitForDeployment();
  const pythIntegrationAddress = await pythIntegration.getAddress();
  console.log("✅ PythIntegration deployed to:", pythIntegrationAddress);

  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETED!");
  console.log("=".repeat(60));
  console.log("\n📝 New Contract Address:");
  console.log("  PythIntegration:", pythIntegrationAddress);

  console.log("\n🌐 Explorer Link:");
  console.log(`  https://sepolia.basescan.org/address/${pythIntegrationAddress}`);

  console.log("\n🔍 Verification Command:");
  console.log(`npx hardhat verify --network ${networkName} ${pythIntegrationAddress} "${addresses.pythEntropy}"`);

  console.log("\n⚠️  IMPORTANT:");
  console.log("  Update frontend/src/config/contracts.ts with new pythIntegration address!");
  console.log(`  pythIntegration: "${pythIntegrationAddress}"`);
  console.log("\n  Then redeploy MegaYieldLottery with the new PythIntegration address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

