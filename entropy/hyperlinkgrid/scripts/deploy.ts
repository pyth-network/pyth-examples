import { ethers } from "hardhat";

async function main() {
  // 1. Setup arguments
  // In a real deployment, you would use existing addresses:
  // USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e (Example, please verify)
  // Pyth Entropy on Base Sepolia: 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c
  // Entropy Provider: 0x6CC14824Ea2918f5De5C2f75A9Da963ad443d51E (Example Pyth Provider)

  // For this script, we will deploy a Mock USDC if on localhost/hardhat
  let usdcAddress = process.env.USDC_ADDRESS;
  const entropyAddress = process.env.ENTROPY_ADDRESS || "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c";
  const entropyProvider = process.env.ENTROPY_PROVIDER || "0x6CC14824Ea2918f5De5C2f75A9Da963ad443d51E";

  if (!usdcAddress) {
    console.log("Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log(`MockUSDC deployed to: ${usdcAddress}`);
  }

  console.log("Deploying HyperlinkgridEntropy...");
  console.log(`USDC: ${usdcAddress}`);
  console.log(`Entropy: ${entropyAddress}`);
  console.log(`Provider: ${entropyProvider}`);

  const HyperlinkgridEntropy = await ethers.getContractFactory("HyperlinkgridEntropy");
  const grid = await HyperlinkgridEntropy.deploy(
    usdcAddress,
    entropyAddress,
    entropyProvider
  );

  await grid.waitForDeployment();

  console.log(`HyperlinkgridEntropy deployed to: ${await grid.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
