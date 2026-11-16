// scripts/deploy_arcade.ts
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

  const Factory = await ethers.getContractFactory("EntropyArcadeV1");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("EntropyArcadeV1 deployed to:", addr);

  // extra confirmations so RPCs see code for eth_call
  const depTx = contract.deploymentTransaction();
  if (depTx) await depTx.wait(2);

  // sanity: ensure there is code
  const code = await ethers.provider.getCode(addr);
  if (code === "0x") throw new Error("No code at deployed address yet");

  // read the provider (public immutable)
  const providerAddr: string = await (contract as any).provider();
  console.log("Entropy provider from contract:", providerAddr);

  // read fee directly from Entropy as a fallback
  const entropy = new ethers.Contract(ENTROPY, ENTROPY_ABI, ethers.provider);
  const feeDirect = await entropy.getFee(providerAddr);
  console.log("Entropy fee (direct) wei:", feeDirect.toString());

  // via contract
  try {
    const feeVia = await (contract as any).getCurrentFee();
    console.log("Entropy fee (via contract) wei:", feeVia.toString());
  } catch (e: any) {
    console.log("Skipping getCurrentFee immediately after deploy:", e?.message || e);
  }

  console.log("\nPaste this into your front-end:");
  console.log(`export const ARCADE_ADDR = "${addr}" as const;`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
