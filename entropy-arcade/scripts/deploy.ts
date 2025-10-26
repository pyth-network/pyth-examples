// import { ethers } from "hardhat";

// async function main() {
//   const [deployer] = await ethers.getSigners();
//   console.log("Deployer:", deployer.address);

//   const Factory = await ethers.getContractFactory("PlinkoEntropy");
//   const contract = await Factory.deploy();
//   await contract.waitForDeployment();
//   const addr = await contract.getAddress();

//   console.log("PlinkoEntropy deployed to:", addr);

//   const fee = await contract.getCurrentFee();
//   console.log("Current Pyth Entropy fee (wei):", fee.toString());
// }

// main().catch((e) => {
//   console.error(e);
//   process.exit(1);
// });

// scripts/deploy.ts
// import hre from "hardhat"; // ← default import (CJS interop)
// const { ethers } = hre;

// async function main() {
//   const [deployer] = await ethers.getSigners();
//   console.log("Deployer:", deployer.address);

//   const Factory = await ethers.getContractFactory("PlinkoEntropy");
//   const contract = await Factory.deploy();
//   await contract.waitForDeployment();

//   const addr = await contract.getAddress();
//   console.log("PlinkoEntropy deployed to:", addr);

//   const fee = await contract.getCurrentFee();
//   console.log("Current Pyth Entropy fee (wei):", fee.toString());
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });

// scripts/deploy.ts (ESM-friendly)
import hre from "hardhat";
const { ethers } = hre;

// Pyth Entropy (Base Sepolia) – official address
const ENTROPY = "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c";
const ENTROPY_ABI = [
  "function getDefaultProvider() view returns (address)",
  "function getFee(address) view returns (uint128)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("PlinkoEntropy");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("PlinkoEntropy deployed to:", addr);

  // extra confirmations so RPCs see code for eth_call
  const depTx = contract.deploymentTransaction();
  if (depTx) await depTx.wait(2);

  // sanity: ensure there is code
  const code = await ethers.provider.getCode(addr);
  if (code === "0x") throw new Error("No code at deployed address yet");

  // read the provider from your contract (public immutable)
  const providerAddr = await (contract as any).provider();
  console.log("Entropy provider from contract:", providerAddr);

  // read fee directly from Entropy as a fallback (avoids ABI mismatch/race)
  const entropy = new ethers.Contract(ENTROPY, ENTROPY_ABI, ethers.provider);
  const feeDirect = await entropy.getFee(providerAddr);
  console.log("Entropy fee (direct) wei:", feeDirect.toString());

  // now try via your contract (safe-guarded)
  try {
    const feeVia = await (contract as any).getCurrentFee();
    console.log("Entropy fee (via contract) wei:", feeVia.toString());
  } catch (e: any) {
    console.log(
      "Skipping getCurrentFee immediately after deploy:",
      e?.message || e,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
