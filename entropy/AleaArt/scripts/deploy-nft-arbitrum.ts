import * as dotenv from "dotenv";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying AleaArt NFT Contract to Arbitrum Sepolia...");
  
  // Check environment variables
  if (!process.env.SEPOLIA_RPC_URL) {
    throw new Error("SEPOLIA_RPC_URL not set in environment variables");
  }
  if (!process.env.SEPOLIA_PRIVATE_KEY) {
    throw new Error("SEPOLIA_PRIVATE_KEY not set in environment variables");
  }
  
  // Connect to Arbitrum Sepolia network
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  
  // Ensure private key has 0x prefix
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY.startsWith('0x') 
    ? process.env.SEPOLIA_PRIVATE_KEY 
    : '0x' + process.env.SEPOLIA_PRIVATE_KEY;
    
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying from address:", wallet.address);
  
  // Read compiled contract artifacts
  const artifactsPath = path.join(__dirname, "../artifacts/contracts/AleaArtNFT.sol/AleaArtNFT.json");
  const artifacts = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
  
  // Create contract factory from artifacts
  const factory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);
  
  // Deploy the contract
  const contract = await factory.deploy();
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);
  
  // Verify deployment
  console.log("Verifying deployment...");
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  
  // Save contract address to environment files
  const envContent = `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${contractAddress}\n`;
  
  try {
    // Update .env.local
    fs.writeFileSync('.env.local', envContent);
    console.log("Contract address saved to .env.local");
    
    // Also update the frontend .env.local
    fs.writeFileSync('frontend-aleart/.env.local', envContent);
    console.log("Contract address saved to frontend-aleart/.env.local");
  } catch (error) {
    console.log("Could not save to .env.local files, please add manually:");
    console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${contractAddress}`);
  }
  
  console.log("\n🎉 Deployment successful!");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Arbitrum Sepolia");
  console.log("Explorer: https://sepolia.arbiscan.io/address/" + contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
