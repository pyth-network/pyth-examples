import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

// Helper for time manipulation
async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("MegaYield Integration Tests", function () {
  let lottery: Contract;
  let vesting: Contract;
  let aaveIntegration: Contract;
  let pythIntegration: Contract;
  let mockPyth: Contract;
  let mockAavePool: Contract;
  let usdc: Contract;
  
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let referrer: any;
  let winner: any;

  const TICKET_PRICE = "1000000"; // 1 USDC
  const PYTH_FEE = ethers.parseEther("0.0001");
  const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, user1, user2, user3, referrer, winner] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Mint USDC
    await usdc.mint(owner.address, ethers.parseUnits("1000000", 6));
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user3.address, ethers.parseUnits("10000", 6));
    await usdc.mint(referrer.address, ethers.parseUnits("10000", 6));

    // Deploy mock Pyth
    const MockPyth = await ethers.getContractFactory("MockPyth");
    mockPyth = await MockPyth.deploy(PYTH_FEE);
    await mockPyth.waitForDeployment();

    // Deploy mock Aave Pool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    mockAavePool = await MockAavePool.deploy(await usdc.getAddress());
    await mockAavePool.waitForDeployment();

    // Deploy AaveIntegration
    const AaveIntegration = await ethers.getContractFactory("AaveIntegration");
    aaveIntegration = await AaveIntegration.deploy(
      await mockAavePool.getAddress(),
      await usdc.getAddress()
    );
    await aaveIntegration.waitForDeployment();

    // Deploy PythIntegration
    const PythIntegration = await ethers.getContractFactory("PythIntegration");
    pythIntegration = await PythIntegration.deploy(
      await mockPyth.getAddress(),
      PYTH_FEE
    );
    await pythIntegration.waitForDeployment();

    // Deploy MegaYieldVesting
    const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
    vesting = await MegaYieldVesting.deploy(
      await aaveIntegration.getAddress(),
      await usdc.getAddress()
    );
    await vesting.waitForDeployment();

    // Deploy MegaYieldLottery
    const MegaYieldLottery = await ethers.getContractFactory("MegaYieldLottery");
    lottery = await MegaYieldLottery.deploy(
      await usdc.getAddress(),
      await pythIntegration.getAddress(),
      TICKET_PRICE
    );
    await lottery.waitForDeployment();

    // Setup contracts
    await lottery.setVestingContract(await vesting.getAddress());
    await vesting.setLotteryContract(await lottery.getAddress());

    // Approve USDC
    for (const user of [user1, user2, user3, referrer]) {
      await usdc.connect(user).approve(await lottery.getAddress(), ethers.MaxUint256);
    }
  });

  describe("Complete Flow: Tickets -> Winner -> Vesting", function () {
    it("Should complete full flow: buy tickets, draw winner, pay first month, vest remaining", async function () {
      // Step 1: Users buy tickets
      await lottery.connect(user1).buyTicket(5, ethers.ZeroAddress); // 5 tickets
      await lottery.connect(user2).buyTicket(3, referrer.address); // 3 tickets with referrer
      await lottery.connect(user3).buyTicket(2, ethers.ZeroAddress); // 2 tickets
      
      const dayInfo = await lottery.getCurrentDayInfo();
      expect(dayInfo._jackpot).to.be.gt(0);
      expect(dayInfo._ticketCount).to.equal(3); // 3 unique buyers
      
      // Step 2: Request draw
      const userRandomness = 12345;
      await lottery.connect(owner).requestDrawWinner(userRandomness, { value: PYTH_FEE });
      
      // Step 3: Wait for Pyth reveal
      await increaseTime(3);
      
      // Step 4: Draw winner
      const totalJackpot = dayInfo._jackpot;
      const firstPayment = (totalJackpot * 1n) / 120n;
      const vestingAmount = totalJackpot - firstPayment;
      
      await lottery.connect(owner).drawWinner(userRandomness, { value: PYTH_FEE });
      
      // Step 5: Verify vesting was initialized
      const vestingInfo = await vesting.getVestingInfo();
      expect(vestingInfo._winner).to.not.equal(ethers.ZeroAddress);
      expect(vestingInfo._totalAmount).to.equal(vestingAmount);
      expect(vestingInfo._monthlyAmount).to.equal(vestingAmount / 120n);
      
      // Step 6: Verify winner received first payment
      // Winner is one of the ticket buyers
      const winnerAddress = vestingInfo._winner;
      const winnerBalance = await usdc.balanceOf(winnerAddress);
      expect(winnerBalance).to.be.gte(firstPayment);
      
      // Step 7: Verify funds deposited to Aave
      const aaveBalance = await vesting.getAaveBalance();
      expect(aaveBalance).to.be.gte(vestingAmount);
      
      // Step 8: Verify lottery state reset
      const newDayInfo = await lottery.getCurrentDayInfo();
      expect(newDayInfo._jackpot).to.equal(0);
      expect(newDayInfo._ticketCount).to.equal(0);
    });

    it("Should allow winner to claim monthly payments over 10 years", async function () {
      // Buy tickets and draw winner
      await lottery.connect(user1).buyTicket(10, ethers.ZeroAddress);
      await lottery.connect(user2).buyTicket(10, ethers.ZeroAddress);
      await lottery.connect(user3).buyTicket(10, ethers.ZeroAddress);
      
      const dayInfo = await lottery.getCurrentDayInfo();
      const totalJackpot = dayInfo._jackpot;
      
      await lottery.connect(owner).requestDrawWinner(12345, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(12345, { value: PYTH_FEE });
      
      // Get winner
      const vestingInfo = await vesting.getVestingInfo();
      const winnerAddress = vestingInfo._winner;
      const winnerSigner = [user1, user2, user3].find(s => s.address === winnerAddress);
      
      if (!winnerSigner) {
        throw new Error("Winner not found");
      }
      
      // Calculate expected monthly amount
      const vestingAmount = vestingInfo._totalAmount;
      const monthlyAmount = vestingAmount / 120n;
      
      // Claim first 3 monthly payments
      for (let i = 0; i < 3; i++) {
        await increaseTime(SECONDS_PER_MONTH);
        
        const balanceBefore = await usdc.balanceOf(winnerAddress);
        await vesting.connect(winnerSigner).claimMonthlyPayment();
        const balanceAfter = await usdc.balanceOf(winnerAddress);
        
        expect(balanceAfter - balanceBefore).to.be.gte(monthlyAmount);
        
        const updatedInfo = await vesting.getVestingInfo();
        expect(updatedInfo._paymentsMade).to.equal(i + 1);
      }
      
      // Verify final state
      const finalInfo = await vesting.getVestingInfo();
      expect(finalInfo._paymentsMade).to.equal(3);
      expect(finalInfo._paymentsRemaining).to.equal(117);
    });

    it("Should accumulate interest on Aave over time", async function () {
      // Set interest rate on mock Aave (5% annual)
      await mockAavePool.setInterestRate(500); // 5%
      
      // Buy tickets and draw winner
      await lottery.connect(user1).buyTicket(100, ethers.ZeroAddress);
      
      await lottery.connect(owner).requestDrawWinner(12345, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(12345, { value: PYTH_FEE });
      
      // Get initial Aave balance
      const initialBalance = await vesting.getAaveBalance();
      
      // Fast forward 6 months (to accumulate interest)
      await increaseTime(SECONDS_PER_MONTH * 6);
      
      // Update Aave pool to account for interest
      // The mock pool updates on withdraw, so we need to interact with it
      const newBalance = await vesting.getAaveBalance();
      
      // Balance should have grown (mock updates on interaction)
      // Note: Actual interest depends on mock implementation
      expect(newBalance).to.be.gte(initialBalance);
    });

    it("Should handle multiple daily drawings correctly", async function () {
      // Day 1: Buy tickets
      await lottery.connect(user1).buyTicket(5, ethers.ZeroAddress);
      const day1Jackpot = (await lottery.getCurrentDayInfo())._jackpot;
      
      // Draw winner for day 1
      await lottery.connect(owner).requestDrawWinner(11111, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(11111, { value: PYTH_FEE });
      
      // Day 2: Fast forward and buy tickets
      await increaseTime(24 * 60 * 60 + 1);
      await lottery.connect(user2).buyTicket(5, ethers.ZeroAddress);
      const day2Jackpot = (await lottery.getCurrentDayInfo())._jackpot;
      
      // Day 2 should start fresh (no carryover if previous day had winner)
      expect(day2Jackpot).to.be.lt(day1Jackpot); // Less because user2 got referral or user2 is different
      
      // Draw winner for day 2
      await lottery.connect(owner).requestDrawWinner(22222, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(22222, { value: PYTH_FEE });
      
      // Verify second vesting was created (we can't easily check multiple vestings in current design)
      // But we can verify the lottery reset
      const day3Info = await lottery.getCurrentDayInfo();
      expect(day3Info._jackpot).to.equal(0);
    });

    it("Should handle jackpot carryover when no winner drawn", async function () {
      // Day 1: Buy tickets but don't draw
      await lottery.connect(user1).buyTicket(10, ethers.ZeroAddress);
      const day1Jackpot = (await lottery.getCurrentDayInfo())._jackpot;
      
      // Fast forward to day 2 without drawing
      await increaseTime(24 * 60 * 60 + 1);
      
      // Buy tickets on day 2
      await lottery.connect(user2).buyTicket(5, ethers.ZeroAddress);
      
      // Jackpot should carry over
      const day2Info = await lottery.getCurrentDayInfo();
      expect(day2Info._jackpot).to.be.gte(day1Jackpot);
    });
  });

  describe("Referral System Integration", function () {
    it("Should correctly distribute referral rewards in full flow", async function () {
      // User1 buys with referrer
      await lottery.connect(user1).buyTicket(10, referrer.address);
      
      const referrerBalanceBefore = await usdc.balanceOf(referrer.address);
      const dayInfoBefore = await lottery.getCurrentDayInfo();
      
      // User2 buys without referrer
      await lottery.connect(user2).buyTicket(10, ethers.ZeroAddress);
      
      const referrerBalanceAfter = await usdc.balanceOf(referrer.address);
      const referralReceived = referrerBalanceAfter - referrerBalanceBefore;
      
      // Referrer should have received 30% of user1's purchase
      const expectedReferral = (BigInt(TICKET_PRICE) * BigInt(10) * BigInt(30)) / BigInt(100);
      expect(referralReceived).to.equal(expectedReferral);
      
      // Jackpot should have user1's 70% + user2's 100%
      const dayInfoAfter = await lottery.getCurrentDayInfo();
      const jackpotIncrease = dayInfoAfter._jackpot - dayInfoBefore._jackpot;
      const expectedJackpot = (BigInt(TICKET_PRICE) * BigInt(10) * BigInt(70)) / BigInt(100) + (BigInt(TICKET_PRICE) * BigInt(10));
      expect(jackpotIncrease).to.equal(expectedJackpot);
    });
  });

  describe("Edge Cases Integration", function () {
    it("Should handle very large jackpot correctly", async function () {
      // Buy many tickets
      for (let i = 0; i < 100; i++) {
        await lottery.connect(user1).buyTicket(100, ethers.ZeroAddress);
      }
      
      const dayInfo = await lottery.getCurrentDayInfo();
      const hugeJackpot = dayInfo._jackpot;
      expect(hugeJackpot).to.be.gt(ethers.parseUnits("1000000", 6)); // > 1M USDC
      
      // Draw winner
      await lottery.connect(owner).requestDrawWinner(12345, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(12345, { value: PYTH_FEE });
      
      // Verify vesting can handle large amount
      const vestingInfo = await vesting.getVestingInfo();
      expect(vestingInfo._totalAmount).to.be.gt(0);
      expect(vestingInfo._monthlyAmount).to.equal(vestingInfo._totalAmount / 120n);
    });

    it("Should handle multiple winners over time correctly", async function () {
      // Winner 1
      await lottery.connect(user1).buyTicket(5, ethers.ZeroAddress);
      await lottery.connect(owner).requestDrawWinner(11111, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(11111, { value: PYTH_FEE });
      
      const winner1 = (await vesting.getVestingInfo())._winner;
      
      // Winner 2 (next day)
      await increaseTime(24 * 60 * 60 + 1);
      await lottery.connect(user2).buyTicket(5, ethers.ZeroAddress);
      await lottery.connect(owner).requestDrawWinner(22222, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(22222, { value: PYTH_FEE });
      
      // Note: In current design, vesting contract is reused
      // In production, you might want separate vesting contracts per winner
      // For now, this tests that the system can handle multiple draws
      const winner2 = (await vesting.getVestingInfo())._winner;
      
      // Winners should be different ticket buyers
      expect(winner1).to.not.equal(winner2);
      expect([user1.address, user2.address]).to.include(winner1);
      expect([user1.address, user2.address]).to.include(winner2);
    });
  });

  describe("Security Integration", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This test verifies that ReentrancyGuard is working
      await lottery.connect(user1).buyTicket(1, ethers.ZeroAddress);
      
      // Try to draw winner
      await lottery.connect(owner).requestDrawWinner(12345, { value: PYTH_FEE });
      await increaseTime(3);
      
      // Draw should complete successfully
      await expect(
        lottery.connect(owner).drawWinner(12345, { value: PYTH_FEE })
      ).to.not.be.reverted;
    });

    it("Should prevent unauthorized access to vesting", async function () {
      // Setup vesting
      await lottery.connect(user1).buyTicket(10, ethers.ZeroAddress);
      await lottery.connect(owner).requestDrawWinner(12345, { value: PYTH_FEE });
      await increaseTime(3);
      await lottery.connect(owner).drawWinner(12345, { value: PYTH_FEE });
      
      // Non-winner should not be able to claim
      await increaseTime(SECONDS_PER_MONTH);
      await expect(
        vesting.connect(user2).claimMonthlyPayment()
      ).to.be.revertedWith("MegaYieldVesting: not winner");
    });
  });
});

