const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("deployer:", await deployer.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});