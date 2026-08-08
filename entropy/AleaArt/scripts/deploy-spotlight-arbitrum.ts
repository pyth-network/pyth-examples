import * as dotenv from "dotenv";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying SpotlightSelector Contract to Arbitrum Sepolia...");
  
  if (!process.env.SEPOLIA_RPC_URL) {
    throw new Error("SEPOLIA_RPC_URL not set in environment variables");
  }
  if (!process.env.SEPOLIA_PRIVATE_KEY) {
    throw new Error("SEPOLIA_PRIVATE_KEY not set in environment variables");
  }
  
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY.startsWith('0x') 
    ? process.env.SEPOLIA_PRIVATE_KEY 
    : '0x' + process.env.SEPOLIA_PRIVATE_KEY;
    
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying from address:", wallet.address);
  
  // Contract addresses
  const ALEA_ART_NFT_ADDRESS = "0x806019F8a33A01a4A3fea93320601cC77B6Dcb79";
  
  // Read contract artifacts
  const artifactsPath = path.join(__dirname, "../artifacts/contracts/SpotlightSelector.sol/SpotlightSelector.json");
  const artifacts = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
  
  const factory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);
  
  // Deploy with constructor arguments
  const contract = await factory.deploy(ALEA_ART_NFT_ADDRESS);
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);
  
  console.log("Verifying deployment...");
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  
  const aleaArtNFT = await contract.aleaArtNFT();
  console.log("Connected AleaArtNFT:", aleaArtNFT);
  
  const spotlightDuration = await contract.spotlightDuration();
  console.log("Spotlight duration:", spotlightDuration.toString(), "seconds");
  
  const spotlightFee = await contract.spotlightFee();
  console.log("Spotlight fee:", ethers.formatEther(spotlightFee), "ETH");
  
  // Save contract address to environment files
  const envContent = `NEXT_PUBLIC_SPOTLIGHT_CONTRACT_ADDRESS=${contractAddress}\n`;
  
  try {
    fs.writeFileSync('.env.local', envContent, { flag: 'a' });
    console.log("Contract address saved to .env.local");
    
    fs.writeFileSync('frontend-aleart/.env.local', envContent, { flag: 'a' });
    console.log("Contract address saved to frontend-aleart/.env.local");
  } catch (error) {
    console.log("Could not save to .env.local files, please add manually:");
    console.log(`NEXT_PUBLIC_SPOTLIGHT_CONTRACT_ADDRESS=${contractAddress}`);
  }
  
  console.log("\n🎉 Deployment successful!");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Arbitrum Sepolia");
  console.log("Explorer: https://sepolia.arbiscan.io/address/" + contractAddress);
  console.log("\nContract Details:");
  console.log("- AleaArtNFT Address:", ALEA_ART_NFT_ADDRESS);
  console.log("- Pyth Entropy Contract: 0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440");
  console.log("- Pyth Entropy Provider: 0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344");
  console.log("- Spotlight Duration: 24 hours");
  console.log("- Spotlight Fee: 0.001 ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
