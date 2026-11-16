import { ethers } from "hardhat";
import { ADDRESSES, TICKET_PRICE } from "../config/addresses";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get network
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "baseSepolia" : 
                      network.chainId === 8453n ? "base" : 
                      "unknown";
  
  console.log("Network:", networkName);
  
  const addresses = ADDRESSES[networkName as keyof typeof ADDRESSES];
  if (!addresses) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  // Verify Pyth Entropy address is set
  if (addresses.pythEntropy === "0x0000000000000000000000000000000000000000") {
    console.error("⚠️  WARNING: Pyth Entropy address not set in config/addresses.ts");
    console.error("   Go to: https://docs.pyth.network/entropy/contract-addresses");
    console.error("   Find Base Sepolia address and update config/addresses.ts");
    throw new Error("Pyth Entropy address not set. Update config/addresses.ts first.");
  }
  
  // Verify Aave Pool address is set
  if (addresses.aavePool === "0x0000000000000000000000000000000000000000") {
    console.error("⚠️  WARNING: Aave Pool address not set in config/addresses.ts");
    console.error("   Go to: https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses");
    console.error("   Find Base Sepolia address and update config/addresses.ts");
    throw new Error("Aave Pool address not set. Update config/addresses.ts first.");
  }

  console.log("\n=== Deploying AaveIntegration ===");
  const AaveIntegration = await ethers.getContractFactory("AaveIntegration");
  const aaveIntegration = await AaveIntegration.deploy(
    addresses.aavePool,
    addresses.usdc
  );
  await aaveIntegration.waitForDeployment();
  const aaveIntegrationAddress = await aaveIntegration.getAddress();
  console.log("AaveIntegration deployed to:", aaveIntegrationAddress);

  console.log("\n=== Deploying PythIntegration ===");
  const PythIntegration = await ethers.getContractFactory("PythIntegration");
  const pythIntegration = await PythIntegration.deploy(
    addresses.pythEntropy
  );
  await pythIntegration.waitForDeployment();
  const pythIntegrationAddress = await pythIntegration.getAddress();
  console.log("PythIntegration deployed to:", pythIntegrationAddress);

  console.log("\n=== Deploying MegaYieldVesting ===");
  const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
  const vesting = await MegaYieldVesting.deploy(
    aaveIntegrationAddress,
    addresses.usdc
  );
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("MegaYieldVesting deployed to:", vestingAddress);

  console.log("\n=== Deploying MegaYieldLottery ===");
  const MegaYieldLottery = await ethers.getContractFactory("MegaYieldLottery");
  const lottery = await MegaYieldLottery.deploy(
    addresses.usdc,
    pythIntegrationAddress,
    TICKET_PRICE
  );
  await lottery.waitForDeployment();
  const lotteryAddress = await lottery.getAddress();
  console.log("MegaYieldLottery deployed to:", lotteryAddress);

  console.log("\n=== Setting up contracts ===");
  
  // Set vesting contract in lottery
  const setVestingTx = await lottery.setVestingContract(vestingAddress);
  await setVestingTx.wait();
  console.log("Vesting contract set in lottery");

  // Set lottery contract in vesting
  const setLotteryTx = await vesting.setLotteryContract(lotteryAddress);
  await setLotteryTx.wait();
  console.log("Lottery contract set in vesting");

  console.log("\n=== Deployment Summary ===");
  console.log("AaveIntegration:", aaveIntegrationAddress);
  console.log("PythIntegration:", pythIntegrationAddress);
  console.log("MegaYieldVesting:", vestingAddress);
  console.log("MegaYieldLottery:", lotteryAddress);
  console.log("\nNetwork:", networkName);
  console.log("USDC:", addresses.usdc);
  console.log("Aave Pool:", addresses.aavePool);
  console.log("Pyth Entropy:", addresses.pythEntropy);

  // Save deployment info
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network ${networkName} ${aaveIntegrationAddress} "${addresses.aavePool}" "${addresses.usdc}"`);
  console.log(`npx hardhat verify --network ${networkName} ${pythIntegrationAddress} "${addresses.pythEntropy}"`);
  console.log(`npx hardhat verify --network ${networkName} ${vestingAddress} "${aaveIntegrationAddress}" "${addresses.usdc}"`);
  console.log(`npx hardhat verify --network ${networkName} ${lotteryAddress} "${addresses.usdc}" "${pythIntegrationAddress}" "${TICKET_PRICE}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


