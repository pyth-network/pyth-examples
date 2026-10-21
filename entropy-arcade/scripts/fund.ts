// scripts/fund.ts
import hre from "hardhat";
const { ethers } = hre;

const CONTRACT = "0xA14eC31d36C5ba64307e3eDd5a7B7497a02BB8fB";
const AMOUNT_ETH = "0.05";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Funding from:", signer.address);
  const tx = await signer.sendTransaction({
    to: CONTRACT,
    value: ethers.parseEther(AMOUNT_ETH),
  });
  console.log("Sent tx:", tx.hash);
  await tx.wait();
  const bal = await ethers.provider.getBalance(CONTRACT);
  console.log("Contract balance (wei):", bal.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
