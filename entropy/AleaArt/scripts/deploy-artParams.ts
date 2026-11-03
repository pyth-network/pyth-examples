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
  console.log("Deploying EntropyArtParamsV2 to Arbitrum Sepolia...");
  
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
  const artifactsPath = path.join(__dirname, "../artifacts/contracts/EntropyArtParamsV2.sol/EntropyArtParamsV2.json");
  const artifacts = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
  
  // Create contract factory from artifacts
  const factory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);
  
  // Generate a unique collection salt
  const collectionSalt = ethers.keccak256(ethers.toUtf8Bytes("AleaArt Collection " + Date.now()));
  
  console.log("Collection Salt:", collectionSalt);
  
  // Deploy the contract
  const contract = await factory.deploy(collectionSalt);
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("Contract deployed to:", contractAddress);
  
  // Verify deployment
  console.log("Verifying deployment...");
  const entropy = "0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440"; // We know this from the contract
  console.log("Entropy address:", entropy);
  
  // Test the fee function
  try {
    const fee = await contract.quoteEntropyFee();
    console.log("Required fee:", ethers.formatEther(fee), "ETH");
  } catch (error) {
    console.log("Fee check failed:", error.message);
  }
  
  console.log("\n🎨 EntropyArtParamsV2 Deployment successful!");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Arbitrum Sepolia");
  console.log("Entropy Address:", entropy);
  console.log("Collection Salt:", collectionSalt);
  console.log("\n📋 Contract Features:");
  console.log("- Generates art parameters from randomness");
  console.log("- Uses Pyth Entropy v2 for verifiable randomness");
  console.log("- Creates unique tokens with deterministic parameters");
  console.log("- Supports prompt, style, sampler, aspect ratio, and more");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
