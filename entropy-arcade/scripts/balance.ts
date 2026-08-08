import hre from "hardhat";
const { ethers } = hre;

const CONTRACT = "0xA14eC31d36C5ba64307e3eDd5a7B7497a02BB8fB";

async function main() {
  const bal = await ethers.provider.getBalance(CONTRACT);
  console.log("Contract balance (ETH):", ethers.formatEther(bal));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
