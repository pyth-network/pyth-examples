import { ethers } from "ethers";
import hre from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as string; // Update with your factory address
  const DEPOSIT_AMOUNT = ethers.parseEther("0.1"); // Deposit 0.1 ETH for entropy fees
  
  // Get the contract artifact
  const contractArtifact = await hre.artifacts.readArtifact("RaffleFactory");
  
  // Create a provider and signer
  const provider = new ethers.JsonRpcProvider(process.env.RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
  
  // Create contract instance
  const factory = new ethers.Contract(FACTORY_ADDRESS, contractArtifact.abi, signer);

  console.log("Depositing ETH to factory...");
  console.log("Factory Address:", FACTORY_ADDRESS);
  console.log("Deposit Amount:", ethers.formatEther(DEPOSIT_AMOUNT), "ETH");
  
  // Check current balance
  const currentBalance = await factory.getFactoryBalance();
  console.log("Current Factory Balance:", ethers.formatEther(currentBalance), "ETH");
  
  // Deposit ETH
  const tx = await factory.depositETH({ value: DEPOSIT_AMOUNT });
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed:", receipt?.status === 1 ? "Success" : "Failed");
  
  // Check new balance
  const newBalance = await factory.getFactoryBalance();
  const entropyReserve = await factory.getEntropyFeeReserve();
  
  console.log("New Factory Balance:", ethers.formatEther(newBalance), "ETH");
  console.log("Entropy Fee Reserve:", ethers.formatEther(entropyReserve), "ETH");
  
  console.log("✅ ETH deposited successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
