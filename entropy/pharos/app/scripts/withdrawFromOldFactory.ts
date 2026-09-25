import { ethers } from "ethers";
import hre from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  const OLD_FACTORY_ADDRESS = process.env.OLD_FACTORY_ADDRESS as string; // Your old factory address
  
  // Get the contract artifact
  const contractArtifact = await hre.artifacts.readArtifact("RaffleFactory");
  
  // Create a provider and signer
  const provider = new ethers.JsonRpcProvider(process.env.RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
  
  // Create contract instance
  const factory = new ethers.Contract(OLD_FACTORY_ADDRESS, contractArtifact.abi, signer);

  console.log("Withdrawing ETH from old factory...");
  console.log("Old Factory Address:", OLD_FACTORY_ADDRESS);
  
  // Check current balance
  const currentBalance = await factory.getFactoryBalance();
  console.log("Current Factory Balance:", ethers.formatEther(currentBalance), "ETH");
  
  if (currentBalance === BigInt(0)) {
    console.log("❌ No ETH to withdraw from old factory");
    return;
  }
  
  // Withdraw all ETH
  const tx = await factory.withdrawETH();
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed:", receipt?.status === 1 ? "Success" : "Failed");
  
  // Check new balance
  const newBalance = await factory.getFactoryBalance();
  console.log("New Factory Balance:", ethers.formatEther(newBalance), "ETH");
  
  console.log("✅ ETH withdrawn successfully!");
  console.log("💡 Now deploy the new factory and deposit ETH to it");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
