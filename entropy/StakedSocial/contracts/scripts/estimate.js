const { ethers } = require("hardhat");

async function main() {
  const Factory = await ethers.getContractFactory("FriendsGroupBets");

  // create unsigned deploy tx
  const deployTx = Factory.getDeployTransaction();

  // estimate gas for deployment
  const gas = await ethers.provider.estimateGas(deployTx);

  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");

  const costWei = gas * gasPrice;

  console.log("Estimated gas:", gas.toString());
  console.log("Gas price:", gasPrice.toString());
  console.log("Estimated deployment cost (wei):", costWei.toString());
  console.log("Deployment cost in CELO:", ethers.formatEther(costWei));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
