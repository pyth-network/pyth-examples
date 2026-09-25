import { ethers } from "hardhat";
import { ADDRESSES, TICKET_PRICE } from "../config/addresses";

/**
 * Script to simulate a complete lottery cycle:
 * 1. Multiple users buy tickets
 * 2. Jackpot grows
 * 3. Winner is drawn
 * 4. Results are displayed
 */
async function main() {
  console.log("🎰 Starting Lottery Simulation...\n");

  // Get network
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "baseSepolia" : 
                      network.chainId === 8453n ? "base" : 
                      "local";
  
  console.log(`📡 Network: ${networkName}\n`);

  // Get signers (simulate multiple users)
  const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
  
  console.log("👥 Participants:");
  console.log(`  Owner: ${owner.address}`);
  console.log(`  User1: ${user1.address}`);
  console.log(`  User2: ${user2.address}`);
  console.log(`  User3: ${user3.address}`);
  console.log(`  User4: ${user4.address}`);
  console.log(`  User5: ${user5.address}\n`);

  // Get contract addresses
  const addresses = ADDRESSES[networkName as keyof typeof ADDRESSES];
  if (!addresses) {
    console.error("❌ Contract addresses not found for this network");
    console.error("💡 Deploy contracts first or use local network");
    return;
  }

  const lotteryAddress = addresses.lottery;
  const usdcAddress = addresses.usdc;

  // Get contract instances
  const lottery = await ethers.getContractAt("MegaYieldLottery", lotteryAddress);
  const usdc = await ethers.getContractAt("ERC20", usdcAddress);

  console.log(`📋 Contracts:`);
  console.log(`  Lottery: ${lotteryAddress}`);
  console.log(`  USDC: ${usdcAddress}\n`);

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
    { user: user1, amount: 3, name: "User1 (again)" }, // Same user buying more
  ];

  // Approve USDC for all users first
  console.log("🔐 Approving USDC spending...");
  for (const purchase of purchases) {
    const totalCost = BigInt(TICKET_PRICE) * BigInt(purchase.amount);
    try {
      const tx = await usdc.connect(purchase.user).approve(lotteryAddress, totalCost);
      await tx.wait();
    } catch (error: any) {
      // Might already be approved
      if (!error.message.includes("already approved")) {
        console.error(`  ⚠️  Approval failed for ${purchase.name}: ${error.message}`);
      }
    }
  }
  console.log("  ✅ Approvals complete\n");

  // Execute purchases
  for (const purchase of purchases) {
    try {
      const totalCost = BigInt(TICKET_PRICE) * BigInt(purchase.amount);
      const balanceBefore = await usdc.balanceOf(purchase.user.address);
      
      console.log(`  🎟️  ${purchase.name} buying ${purchase.amount} ticket(s)...`);
      
      const tx = await lottery.connect(purchase.user).buyTicket(
        purchase.amount,
        ethers.ZeroAddress // No referrer
      );
      await tx.wait();

      const balanceAfter = await usdc.balanceOf(purchase.user.address);
      const spent = balanceBefore - balanceAfter;
      
      console.log(`     ✅ Purchased! Spent: ${ethers.formatUnits(spent, 6)} USDC`);
      
      // Get updated jackpot
      const info = await lottery.getCurrentDayInfo();
      console.log(`     💰 New Jackpot: ${ethers.formatUnits(info._jackpot, 6)} USDC`);
      console.log(`     🎫 Total Tickets: ${info._ticketCount}\n`);
    } catch (error: any) {
      console.error(`     ❌ Failed: ${error.message}\n`);
    }
  }

  // Final state before drawing
  const finalInfo = await lottery.getCurrentDayInfo();
  console.log("📊 Final State Before Drawing:");
  console.log(`  Jackpot: ${ethers.formatUnits(finalInfo._jackpot, 6)} USDC`);
  console.log(`  Tickets: ${finalInfo._ticketCount}`);
  console.log(`  Current Day: ${finalInfo._currentDay}\n`);

  // Simulate drawing winner
  console.log("🎲 Drawing Winner...\n");
  
  try {
    // Get required fee for Pyth
    const pythIntegrationAddress = addresses.pythIntegration;
    const pythIntegration = await ethers.getContractAt("PythIntegration", pythIntegrationAddress);
    const requiredFee = await pythIntegration.getRequiredFee();
    
    console.log(`  💸 Pyth Fee Required: ${ethers.formatEther(requiredFee)} ETH`);
    
    // Request draw (this will trigger Pyth callback)
    console.log("  📞 Requesting random number from Pyth...");
    const drawTx = await lottery.requestDrawWinner(0, { value: requiredFee });
    const receipt = await drawTx.wait();
    
    // Find RandomNumberRequested event
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
      console.log(`  ✅ Random number requested! Sequence: ${sequenceNumber}\n`);
      
      // Note: In a real scenario, Pyth would call the callback automatically
      // For simulation, we need to manually trigger it if using mocks
      console.log("  ⚠️  Note: In production, Pyth Entropy will automatically call the callback");
      console.log("     For local testing with mocks, you may need to manually trigger the callback\n");
    }

    // Check if winner was drawn (might need to wait for callback)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait a bit
    
    const day = finalInfo._currentDay;
    const winner = await lottery.getWinner(day);
    const dayDrawn = await lottery.dayDrawn(day);

    if (dayDrawn && winner !== ethers.ZeroAddress) {
      console.log("🎉 Winner Drawn!");
      console.log(`  🏆 Winner Address: ${winner}`);
      console.log(`  📅 Day: ${day}`);
      
      // Find winner name
      const winnerName = purchases.find(p => 
        p.user.address.toLowerCase() === winner.toLowerCase()
      )?.name || "Unknown";
      console.log(`  👤 Winner: ${winnerName}`);
      
      // Calculate prize
      const monthlyPayment = Number(finalInfo._jackpot) / 1_000_000 / 120;
      const firstPayment = monthlyPayment;
      console.log(`  💵 First Payment: $${firstPayment.toFixed(2)} USDC (immediate)`);
      console.log(`  📊 Monthly Payment: $${monthlyPayment.toFixed(2)} USDC (for 120 months)`);
      console.log(`  🎁 Total Prize: ${ethers.formatUnits(finalInfo._jackpot, 6)} USDC\n`);
    } else {
      console.log("  ⏳ Winner not drawn yet (waiting for Pyth callback)");
      console.log("  💡 In local testing, you may need to manually trigger the callback\n");
    }

  } catch (error: any) {
    console.error(`  ❌ Drawing failed: ${error.message}\n`);
    console.error("  💡 Make sure:");
    console.error("     - Contracts are deployed");
    console.error("     - You have enough ETH for Pyth fee");
    console.error("     - There are tickets in the current day");
  }

  console.log("✨ Simulation Complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

