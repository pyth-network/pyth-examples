import { ethers } from "hardhat";

/**
 * Deploy solo MegaYieldLottery aggiornato
 * Usa gli indirizzi esistenti degli altri contratti
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== Deploy Solo MegaYieldLottery ===\n");
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Get network
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "baseSepolia" : 
                      network.chainId === 8453n ? "base" : 
                      "unknown";
  
  console.log("Network:", networkName);

  // Indirizzi esistenti (dal deploy precedente)
  const EXISTING_ADDRESSES = {
    baseSepolia: {
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      pythIntegration: "0xb8a0ac385b80362EEb7a0843be07C6B7C9ab6092", // Nuovo deploy con SDK ufficiale
      vesting: "0x7314251E4CEb115fbA106f84BB5B7Ef8a6ABae3E", // Dal deploy precedente
    }
  };

  const addresses = EXISTING_ADDRESSES[networkName as keyof typeof EXISTING_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const TICKET_PRICE = "1000000"; // 1 USDC

  console.log("\n📋 Using existing addresses:");
  console.log("  USDC:", addresses.usdc);
  console.log("  PythIntegration:", addresses.pythIntegration);
  console.log("  Vesting:", addresses.vesting);
  console.log("  Ticket Price:", TICKET_PRICE, "(1 USDC)");

  console.log("\n=== Deploying MegaYieldLottery ===");
  const MegaYieldLottery = await ethers.getContractFactory("MegaYieldLottery");
  const lottery = await MegaYieldLottery.deploy(
    addresses.usdc,
    addresses.pythIntegration,
    TICKET_PRICE
  );
  await lottery.waitForDeployment();
  const lotteryAddress = await lottery.getAddress();
  console.log("✅ MegaYieldLottery deployed to:", lotteryAddress);

  console.log("\n=== Setting up contracts ===");
  
  // Set vesting contract in lottery
  const setVestingTx = await lottery.setVestingContract(addresses.vesting);
  await setVestingTx.wait();
  console.log("✅ Vesting contract set in lottery");

  // Set lottery contract in vesting (se ha la funzione)
  try {
    const vesting = await ethers.getContractAt("MegaYieldVesting", addresses.vesting);
    const setLotteryTx = await vesting.setLotteryContract(lotteryAddress);
    await setLotteryTx.wait();
    console.log("✅ Lottery contract set in vesting");
  } catch (error) {
    console.log("⚠️  Could not set lottery in vesting (may not be needed)");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETED!");
  console.log("=".repeat(60));
  console.log("\n📝 New Contract Address:");
  console.log("  MegaYieldLottery:", lotteryAddress);

  console.log("\n🌐 Explorer Link:");
  console.log(`  https://sepolia.basescan.org/address/${lotteryAddress}`);

  console.log("\n🔍 Verification Command:");
  console.log(`npx hardhat verify --network ${networkName} ${lotteryAddress} "${addresses.usdc}" "${addresses.pythIntegration}" "${TICKET_PRICE}"`);

  console.log("\n⚠️  IMPORTANT:");
  console.log("  Update frontend/src/config/contracts.ts with new lottery address!");
  console.log(`  lottery: "${lotteryAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

