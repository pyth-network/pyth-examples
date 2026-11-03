import { ethers } from "hardhat";

/**
 * Complete local simulation:
 * 1. Deploy all contracts locally
 * 2. Simulate multiple users buying tickets
 * 3. Simulate drawing winner
 * 4. Display results
 */
async function main() {
  console.log("🎰 Starting Complete Local Lottery Simulation...\n");

  const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
  
  console.log("👥 Participants:");
  console.log(`  Owner: ${owner.address}`);
  console.log(`  User1: ${user1.address}`);
  console.log(`  User2: ${user2.address}`);
  console.log(`  User3: ${user3.address}`);
  console.log(`  User4: ${user4.address}`);
  console.log(`  User5: ${user5.address}\n`);

  // Deploy Mock USDC
  console.log("📦 Deploying Mock USDC...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  console.log(`  ✅ USDC deployed: ${await usdc.getAddress()}\n`);

  // Mint USDC for all users
  console.log("💰 Minting USDC...");
  const mintAmount = ethers.parseUnits("10000", 6);
  for (const user of [owner, user1, user2, user3, user4, user5]) {
    await usdc.mint(user.address, mintAmount);
  }
  console.log(`  ✅ Minted ${ethers.formatUnits(mintAmount, 6)} USDC for each user\n`);

  // Deploy Mock Pyth
  const PYTH_FEE = ethers.parseEther("0.0001");
  console.log("📦 Deploying Mock Pyth...");
  const MockPyth = await ethers.getContractFactory("MockPyth");
  const mockPyth = await MockPyth.deploy(PYTH_FEE);
  await mockPyth.waitForDeployment();
  console.log(`  ✅ Mock Pyth deployed: ${await mockPyth.getAddress()}\n`);

  // Deploy PythIntegration
  console.log("📦 Deploying PythIntegration...");
  const PythIntegration = await ethers.getContractFactory("PythIntegration");
  const pythIntegration = await PythIntegration.deploy(await mockPyth.getAddress());
  await pythIntegration.waitForDeployment();
  console.log(`  ✅ PythIntegration deployed: ${await pythIntegration.getAddress()}\n`);

  // Deploy Mock Aave Pool
  console.log("📦 Deploying Mock Aave Pool...");
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const mockAavePool = await MockAavePool.deploy();
  await mockAavePool.waitForDeployment();
  console.log(`  ✅ Mock Aave Pool deployed: ${await mockAavePool.getAddress()}\n`);

  // Deploy AaveIntegration
  console.log("📦 Deploying AaveIntegration...");
  const AaveIntegration = await ethers.getContractFactory("AaveIntegration");
  const aaveIntegration = await AaveIntegration.deploy(
    await mockAavePool.getAddress(),
    await usdc.getAddress()
  );
  await aaveIntegration.waitForDeployment();
  console.log(`  ✅ AaveIntegration deployed: ${await aaveIntegration.getAddress()}\n`);

  // Deploy MegaYieldVesting
  console.log("📦 Deploying MegaYieldVesting...");
  const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
  const vesting = await MegaYieldVesting.deploy(await aaveIntegration.getAddress(), await usdc.getAddress());
  await vesting.waitForDeployment();
  console.log(`  ✅ MegaYieldVesting deployed: ${await vesting.getAddress()}\n`);

  // Deploy MegaYieldLottery
  const TICKET_PRICE = "1000000"; // 1 USDC
  console.log("📦 Deploying MegaYieldLottery...");
  const MegaYieldLottery = await ethers.getContractFactory("MegaYieldLottery");
  const lottery = await MegaYieldLottery.deploy(
    await usdc.getAddress(),
    await pythIntegration.getAddress(),
    TICKET_PRICE
  );
  await lottery.waitForDeployment();
  console.log(`  ✅ MegaYieldLottery deployed: ${await lottery.getAddress()}\n`);

  // Setup contracts
  console.log("🔗 Setting up contracts...");
  await lottery.setVestingContract(await vesting.getAddress());
  await vesting.setLotteryContract(await lottery.getAddress());
  console.log("  ✅ Contracts linked\n");

  // Approve USDC for all users
  console.log("🔐 Approving USDC...");
  for (const user of [user1, user2, user3, user4, user5]) {
    await usdc.connect(user).approve(await lottery.getAddress(), ethers.MaxUint256);
  }
  console.log("  ✅ Approvals complete\n");

  // Check initial state
  const initialInfo = await lottery.getCurrentDayInfo();
  console.log("📊 Initial State:");
  console.log(`  Current Day: ${initialInfo._currentDay}`);
  console.log(`  Jackpot: ${ethers.formatUnits(initialInfo._jackpot, 6)} USDC`);
  console.log(`  Tickets: ${initialInfo._ticketCount}\n`);

  // Simulate ticket purchases
  console.log("🎫 Simulating Ticket Purchases...\n");

  const purchases = [
    { user: user1, amount: 5, name: "User1" },
    { user: user2, amount: 3, name: "User2" },
    { user: user3, amount: 10, name: "User3" },
    { user: user4, amount: 2, name: "User4" },
    { user: user5, amount: 7, name: "User5" },
    { user: user1, amount: 3, name: "User1 (again)" },
  ];

  for (const purchase of purchases) {
    try {
      console.log(`  🎟️  ${purchase.name} buying ${purchase.amount} ticket(s)...`);
      
      const tx = await lottery.connect(purchase.user).buyTicket(
        purchase.amount,
        ethers.ZeroAddress
      );
      await tx.wait();

      const info = await lottery.getCurrentDayInfo();
      console.log(`     ✅ Purchased! Jackpot: ${ethers.formatUnits(info._jackpot, 6)} USDC, Tickets: ${info._ticketCount}\n`);
    } catch (error: any) {
      console.error(`     ❌ Failed: ${error.message}\n`);
    }
  }

  // Final state
  const finalInfo = await lottery.getCurrentDayInfo();
  console.log("📊 Final State Before Drawing:");
  console.log(`  Jackpot: ${ethers.formatUnits(finalInfo._jackpot, 6)} USDC`);
  console.log(`  Tickets: ${finalInfo._ticketCount}\n`);

  // Draw winner
  console.log("🎲 Drawing Winner...\n");
  
  try {
    const requiredFee = await pythIntegration.getRequiredFee();
    console.log(`  💸 Pyth Fee: ${ethers.formatEther(requiredFee)} ETH`);
    
    // Request draw
    console.log("  📞 Requesting random number...");
    const drawTx = await lottery.requestDrawWinner(0, { value: requiredFee });
    const receipt = await drawTx.wait();
    
    // Get sequence number from event
    const randomEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = lottery.interface.parseLog(log);
        return parsed?.name === "RandomNumberRequested";
      } catch {
        return false;
      }
    });

    if (randomEvent) {
      const parsed = lottery.interface.parseLog(randomEvent);
      const sequenceNumber = parsed?.args[0];
      console.log(`  ✅ Sequence: ${sequenceNumber}`);
      
      // Advance blocks to make callback ready
      console.log("  ⏳ Advancing blocks for callback...");
      await ethers.provider.send("evm_mine", []);
      
      // Manually trigger callback
      // In production, Pyth does this automatically
      console.log("  🎲 Executing callback...");
      await mockPyth.executeCallback(sequenceNumber);
      
      console.log("  ✅ Callback executed!\n");
      
      // Wait a bit for transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check winner
      const day = finalInfo._currentDay;
      const winner = await lottery.getWinner(day);
      const dayDrawn = await lottery.dayDrawn(day);

      if (dayDrawn && winner !== ethers.ZeroAddress) {
        console.log("🎉 Winner Drawn!");
        console.log(`  🏆 Winner: ${winner}`);
        
        // Find winner name
        const winnerName = purchases.find(p => 
          p.user.address.toLowerCase() === winner.toLowerCase()
        )?.name || "Unknown";
        console.log(`  👤 Winner Name: ${winnerName}`);
        
        // Calculate prize
        const jackpotAmount = Number(finalInfo._jackpot) / 1_000_000;
        const monthlyPayment = jackpotAmount / 120;
        const firstPayment = monthlyPayment;
        
        console.log(`  💵 First Payment: $${firstPayment.toFixed(2)} USDC (immediate)`);
        console.log(`  📊 Monthly Payment: $${monthlyPayment.toFixed(2)} USDC (120 months)`);
        console.log(`  🎁 Total Prize: $${jackpotAmount.toFixed(2)} USDC\n`);
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Drawing failed: ${error.message}\n`);
  }

  console.log("✨ Simulation Complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

