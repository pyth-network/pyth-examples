const { ethers } = require("hardhat");

async function main() {
  const CONTRACT_NAME = "FriendsGroupBets";
  const ARGS = [];

  console.log(`Deploying ${CONTRACT_NAME}...`);

  const Factory = await ethers.getContractFactory(CONTRACT_NAME);

  const deployTx = Factory.getDeployTransaction(...ARGS);
  const gasEstimate = await ethers.provider.estimateGas(deployTx);
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");
  const costWei = gasEstimate * gasPrice;

  console.log("Gas Estimate:", gasEstimate.toString());
  console.log("Gas Price:", gasPrice.toString());
  console.log("Estimated Cost CELO:", ethers.formatEther(costWei));

  const contract = await Factory.deploy(...ARGS);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("Deployed to:", address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
