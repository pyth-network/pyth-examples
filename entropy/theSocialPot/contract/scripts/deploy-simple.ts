import { ethers } from "hardhat";
import { ADDRESSES, TICKET_PRICE } from "../config/addresses";

/**
 * Deploy script semplificato - Opzione C: Deploy senza Aave
 * Deploy solo PythIntegration + MegaYieldLottery
 * Il vesting contract viene deployato ma con address dummy per Aave
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== Deploy Semplificato (Senza Aave) ===\n");
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

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
    throw new Error("Pyth Entropy address not set in config/addresses.ts");
  }

  console.log("\n📋 Configuration:");
  console.log("  Pyth Entropy:", addresses.pythEntropy);
  console.log("  USDC:", addresses.usdc);
  console.log("  Pyth Fee:", addresses.pythFee, "wei");
  console.log("  Ticket Price:", TICKET_PRICE, "(1 USDC)");

  console.log("\n=== Step 1: Deploying PythIntegration ===");
  const PythIntegration = await ethers.getContractFactory("PythIntegration");
  const pythIntegration = await PythIntegration.deploy(addresses.pythEntropy);
  await pythIntegration.waitForDeployment();
  const pythIntegrationAddress = await pythIntegration.getAddress();
  console.log("✅ PythIntegration deployed to:", pythIntegrationAddress);

  // Verifica fee effettivo
  try {
    const actualFee = await pythIntegration.getRequiredFee();
    console.log("  Pyth fee (actual):", actualFee.toString(), "wei");
    if (actualFee.toString() !== addresses.pythFee) {
      console.log("  ⚠️  Fee mismatch! Config:", addresses.pythFee, "Actual:", actualFee.toString());
    }
  } catch (error) {
    console.log("  ⚠️  Could not fetch actual fee from Pyth");
  }

  console.log("\n=== Step 2: Deploying AaveIntegration (with dummy address) ===");
  // Usiamo address dummy per Aave Pool - non funzionerà ma permette deploy
  const DUMMY_AAVE_POOL = "0x1111111111111111111111111111111111111111";
  const AaveIntegration = await ethers.getContractFactory("AaveIntegration");
  const aaveIntegration = await AaveIntegration.deploy(
    DUMMY_AAVE_POOL, // Dummy address - Aave non funzionerà
    addresses.usdc
  );
  await aaveIntegration.waitForDeployment();
  const aaveIntegrationAddress = await aaveIntegration.getAddress();
  console.log("✅ AaveIntegration deployed to:", aaveIntegrationAddress);
  console.log("  ⚠️  Note: Aave Pool is dummy address - Aave features will not work");

  console.log("\n=== Step 3: Deploying MegaYieldVesting ===");
  const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
  const vesting = await MegaYieldVesting.deploy(
    aaveIntegrationAddress,
    addresses.usdc
  );
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("✅ MegaYieldVesting deployed to:", vestingAddress);

  console.log("\n=== Step 4: Deploying MegaYieldLottery ===");
  const MegaYieldLottery = await ethers.getContractFactory("MegaYieldLottery");
  const lottery = await MegaYieldLottery.deploy(
    addresses.usdc,
    pythIntegrationAddress,
    TICKET_PRICE
  );
  await lottery.waitForDeployment();
  const lotteryAddress = await lottery.getAddress();
  console.log("✅ MegaYieldLottery deployed to:", lotteryAddress);

  console.log("\n=== Step 5: Setting up contracts ===");
  
  // Set vesting contract in lottery
  const setVestingTx = await lottery.setVestingContract(vestingAddress);
  await setVestingTx.wait();
  console.log("✅ Vesting contract set in lottery");

  // Set lottery contract in vesting
  const setLotteryTx = await vesting.setLotteryContract(lotteryAddress);
  await setLotteryTx.wait();
  console.log("✅ Lottery contract set in vesting");

  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETED!");
  console.log("=".repeat(60));
  console.log("\n📝 Contract Addresses:");
  console.log("  PythIntegration:", pythIntegrationAddress);
  console.log("  AaveIntegration:", aaveIntegrationAddress, "(⚠️ dummy Aave Pool)");
  console.log("  MegaYieldVesting:", vestingAddress);
  console.log("  MegaYieldLottery:", lotteryAddress);

  console.log("\n🌐 Explorer Links (Base Sepolia):");
  console.log("  PythIntegration: https://sepolia.basescan.org/address/" + pythIntegrationAddress);
  console.log("  MegaYieldLottery: https://sepolia.basescan.org/address/" + lotteryAddress);
  console.log("  MegaYieldVesting: https://sepolia.basescan.org/address/" + vestingAddress);

  console.log("\n⚠️  IMPORTANT NOTES:");
  console.log("  1. Aave Pool is using dummy address - Aave deposit will FAIL");
  console.log("  2. When winner is drawn, vesting.depositToAave() will revert");
  console.log("  3. To fix: Deploy with real Aave Pool address later");
  console.log("  4. For now, you can test Pyth random generation and winner selection");

  console.log("\n🔍 Verification Commands:");
  console.log(`npx hardhat verify --network ${networkName} ${pythIntegrationAddress} "${addresses.pythEntropy}"`);
  console.log(`npx hardhat verify --network ${networkName} ${aaveIntegrationAddress} "${DUMMY_AAVE_POOL}" "${addresses.usdc}"`);
  console.log(`npx hardhat verify --network ${networkName} ${vestingAddress} "${aaveIntegrationAddress}" "${addresses.usdc}"`);
  console.log(`npx hardhat verify --network ${networkName} ${lotteryAddress} "${addresses.usdc}" "${pythIntegrationAddress}" "${TICKET_PRICE}"`);

  console.log("\n🧪 Next Steps:");
  console.log("  1. Get USDC on Base Sepolia for testing");
  console.log("  2. Approve USDC spending: usdc.approve(lotteryAddress, amount)");
  console.log("  3. Buy tickets: lottery.buyTicket(amount, referrer)");
  console.log("  4. Request random: lottery.requestDrawWinner(userRandomness, {value: pythFee})");
  console.log("  5. Wait ~1 block for Pyth callback");
  console.log("  6. Check winner on Basescan events");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

