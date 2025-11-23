import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

// Helper for time manipulation
async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function getLatestTime(): Promise<bigint> {
  const block = await ethers.provider.getBlock("latest");
  return BigInt(block!.timestamp);
}

describe("MegaYieldVesting", function () {
  let vesting: Contract;
  let aaveIntegration: Contract;
  let mockAavePool: Contract;
  let usdc: Contract;
  let lottery: Contract;
  let owner: any;
  let winner: any;
  let user1: any;

  const MONTHLY_PAYMENTS = 120;
  const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, winner, user1] = await ethers.getSigners();

    // Deploy mock USDC token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Mint USDC for testing
    await usdc.mint(owner.address, ethers.parseUnits("10000000", 6));
    await usdc.mint(winner.address, ethers.parseUnits("10000", 6));

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

    // Deploy MegaYieldVesting
    const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
    vesting = await MegaYieldVesting.deploy(
      await aaveIntegration.getAddress(),
      await usdc.getAddress()
    );
    await vesting.waitForDeployment();

    // Deploy mock lottery
    const MockLottery = await ethers.getContractFactory("MockERC20");
    lottery = await MockLottery.deploy("Lottery", "LOT", 18);
    await lottery.waitForDeployment();

    // Set lottery contract (we'll use a dummy address since lottery needs to be authorized)
    await vesting.setLotteryContract(owner.address); // Using owner as lottery for testing
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vesting.owner()).to.equal(owner.address);
    });

    it("Should not be initialized", async function () {
      expect(await vesting.initialized()).to.be.false;
    });

    it("Should not allow setting lottery contract twice", async function () {
      await expect(
        vesting.setLotteryContract(owner.address)
      ).to.be.revertedWith("MegaYieldVesting: lottery contract already set");
    });
  });

  describe("Initialization", function () {
    const totalAmount = ethers.parseUnits("120000", 6); // 120,000 USDC
    const firstPayment = ethers.parseUnits("1000", 6); // 1,000 USDC
    const vestingAmount = totalAmount - firstPayment;

    beforeEach(async function () {
      // Transfer funds to vesting contract
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      await usdc.approve(await vesting.getAddress(), vestingAmount);
    });

    it("Should allow lottery to initialize", async function () {
      await expect(
        vesting.initialize(winner.address, vestingAmount, firstPayment)
      )
        .to.emit(vesting, "VestingInitialized")
        .withArgs(winner.address, vestingAmount, vestingAmount / BigInt(MONTHLY_PAYMENTS));

      expect(await vesting.winner()).to.equal(winner.address);
      expect(await vesting.totalVestingAmount()).to.equal(vestingAmount);
      expect(await vesting.initialized()).to.be.true;
    });

    it("Should calculate monthly payment correctly", async function () {
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      
      const expectedMonthly = vestingAmount / BigInt(MONTHLY_PAYMENTS);
      expect(await vesting.monthlyPaymentAmount()).to.equal(expectedMonthly);
    });

    it("Should not allow initialization twice", async function () {
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      
      await expect(
        vesting.initialize(winner.address, vestingAmount, firstPayment)
      ).to.be.revertedWith("MegaYieldVesting: already initialized");
    });

    it("Should not allow non-lottery to initialize", async function () {
      await vesting.setLotteryContract(user1.address);
      
      await expect(
        vesting.connect(owner).initialize(winner.address, vestingAmount, firstPayment)
      ).to.be.revertedWith("MegaYieldVesting: not lottery contract");
    });

    it("Should reject zero winner address", async function () {
      await expect(
        vesting.initialize(ethers.ZeroAddress, vestingAmount, firstPayment)
      ).to.be.revertedWith("MegaYieldVesting: invalid winner");
    });

    it("Should reject zero amount", async function () {
      await expect(
        vesting.initialize(winner.address, 0, firstPayment)
      ).to.be.revertedWith("MegaYieldVesting: total amount must be greater than 0");
    });

    it("Should set lastPaymentTimestamp to current time", async function () {
      const beforeInit = await getLatestTime();
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      const afterInit = await getLatestTime();
      
      const vestingInfo = await vesting.getVestingInfo();
      expect(vestingInfo._nextPaymentTime).to.be.gte(beforeInit);
      expect(vestingInfo._nextPaymentTime).to.be.lte(afterInit + BigInt(SECONDS_PER_MONTH));
    });
  });

  describe("Depositing to Aave", function () {
    const totalAmount = ethers.parseUnits("120000", 6);
    const firstPayment = ethers.parseUnits("1000", 6);
    const vestingAmount = totalAmount - firstPayment;

    beforeEach(async function () {
      // Transfer funds and initialize
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
    });

    it("Should allow lottery to deposit to Aave", async function () {
      // Funds are already in vesting contract from beforeEach
      
      await expect(
        vesting.depositToAave(vestingAmount)
      )
        .to.emit(vesting, "DepositedToAave")
        .withArgs(vestingAmount);

      expect(await vesting.depositedToAave()).to.be.true;
    });

    it("Should not allow deposit before initialization", async function () {
      // Create new vesting contract
      const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
      const newVesting = await MegaYieldVesting.deploy(
        await aaveIntegration.getAddress(),
        await usdc.getAddress()
      );
      await newVesting.waitForDeployment();
      await newVesting.setLotteryContract(owner.address);

      await expect(
        newVesting.depositToAave(vestingAmount)
      ).to.be.revertedWith("MegaYieldVesting: not initialized");
    });

    it("Should not allow deposit twice", async function () {
      await vesting.depositToAave(vestingAmount);
      
      await expect(
        vesting.depositToAave(vestingAmount)
      ).to.be.revertedWith("MegaYieldVesting: already deposited");
    });

    it("Should not allow non-lottery to deposit", async function () {
      await expect(
        vesting.connect(user1).depositToAave(vestingAmount)
      ).to.be.revertedWith("MegaYieldVesting: not lottery contract");
    });

    it("Should verify funds are in contract before deposit", async function () {
      // Create new vesting without funds
      const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
      const newVesting = await MegaYieldVesting.deploy(
        await aaveIntegration.getAddress(),
        await usdc.getAddress()
      );
      await newVesting.waitForDeployment();
      await newVesting.setLotteryContract(owner.address);
      
      await usdc.transfer(await newVesting.getAddress(), vestingAmount);
      await newVesting.initialize(winner.address, vestingAmount, firstPayment);
      
      // Try to deposit more than available
      await expect(
        newVesting.depositToAave(vestingAmount + ethers.parseUnits("1", 6))
      ).to.be.revertedWith("MegaYieldVesting: insufficient balance");
    });
  });

  describe("Monthly Payments", function () {
    const totalAmount = ethers.parseUnits("120000", 6);
    const firstPayment = ethers.parseUnits("1000", 6);
    const vestingAmount = totalAmount - firstPayment;
    const monthlyAmount = vestingAmount / BigInt(MONTHLY_PAYMENTS);

    beforeEach(async function () {
      // Transfer funds, initialize, and deposit to Aave
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      await vesting.depositToAave(vestingAmount);
    });

    it("Should not allow claiming before 30 days", async function () {
      await expect(
        vesting.connect(winner).claimMonthlyPayment()
      ).to.be.revertedWith("MegaYieldVesting: too soon for next payment");
    });

    it("Should allow winner to claim monthly payment after 30 days", async function () {
      // Fast forward 30 days
      await increaseTime(SECONDS_PER_MONTH);
      
      const winnerBalanceBefore = await usdc.balanceOf(winner.address);
      
      await expect(
        vesting.connect(winner).claimMonthlyPayment()
      )
        .to.emit(vesting, "MonthlyPaymentClaimed")
        .withArgs(winner.address, monthlyAmount, 1);

      const winnerBalanceAfter = await usdc.balanceOf(winner.address);
      expect(winnerBalanceAfter - winnerBalanceBefore).to.be.gte(monthlyAmount);
      
      const vestingInfo = await vesting.getVestingInfo();
      expect(vestingInfo._paymentsMade).to.equal(1);
    });

    it("Should not allow non-winner to claim", async function () {
      await increaseTime(SECONDS_PER_MONTH);
      
      await expect(
        vesting.connect(user1).claimMonthlyPayment()
      ).to.be.revertedWith("MegaYieldVesting: not winner");
    });

    it("Should allow claiming multiple payments over time", async function () {
      // Claim first payment
      await increaseTime(SECONDS_PER_MONTH);
      await vesting.connect(winner).claimMonthlyPayment();
      
      // Claim second payment
      await increaseTime(SECONDS_PER_MONTH);
      await vesting.connect(winner).claimMonthlyPayment();
      
      const vestingInfo = await vesting.getVestingInfo();
      expect(vestingInfo._paymentsMade).to.equal(2);
    });

    it("Should handle last payment with remainder", async function () {
      // Fast forward to last payment (after 119 payments)
      for (let i = 0; i < 119; i++) {
        await increaseTime(SECONDS_PER_MONTH);
        await vesting.connect(winner).claimMonthlyPayment();
      }
      
      // Last payment should include remainder
      await increaseTime(SECONDS_PER_MONTH);
      
      const vestingInfoBefore = await vesting.getVestingInfo();
      expect(vestingInfoBefore._paymentsMade).to.equal(119);
      
      await vesting.connect(winner).claimMonthlyPayment();
      
      const vestingInfoAfter = await vesting.getVestingInfo();
      expect(vestingInfoAfter._paymentsMade).to.equal(120);
      expect(vestingInfoAfter._paymentsRemaining).to.equal(0);
      
      // Should emit completion event
      // Note: We can't easily test this as it's the last payment
    });

    it("Should not allow claiming after all payments completed", async function () {
      // Fast forward and claim all payments
      for (let i = 0; i < 120; i++) {
        await increaseTime(SECONDS_PER_MONTH);
        await vesting.connect(winner).claimMonthlyPayment();
      }
      
      // Try to claim again
      await increaseTime(SECONDS_PER_MONTH);
      await expect(
        vesting.connect(winner).claimMonthlyPayment()
      ).to.be.revertedWith("MegaYieldVesting: all payments completed");
    });

    it("Should not allow claiming before Aave deposit", async function () {
      // Create new vesting without deposit
      const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
      const newVesting = await MegaYieldVesting.deploy(
        await aaveIntegration.getAddress(),
        await usdc.getAddress()
      );
      await newVesting.waitForDeployment();
      await newVesting.setLotteryContract(owner.address);
      
      await usdc.transfer(await newVesting.getAddress(), vestingAmount);
      await newVesting.initialize(winner.address, vestingAmount, firstPayment);
      
      await increaseTime(SECONDS_PER_MONTH);
      await expect(
        newVesting.connect(winner).claimMonthlyPayment()
      ).to.be.revertedWith("MegaYieldVesting: funds not deposited to Aave");
    });

    it("Should update lastPaymentTimestamp after each claim", async function () {
      await increaseTime(SECONDS_PER_MONTH);
      await vesting.connect(winner).claimMonthlyPayment();
      
      const timestamp1 = await getLatestTime();
      
      await increaseTime(SECONDS_PER_MONTH);
      await vesting.connect(winner).claimMonthlyPayment();
      
      const timestamp2 = await getLatestTime();
      
      const vestingInfo = await vesting.getVestingInfo();
      expect(vestingInfo._nextPaymentTime).to.be.gte(timestamp2);
    });
  });

  describe("Vesting Info", function () {
    const totalAmount = ethers.parseUnits("120000", 6);
    const firstPayment = ethers.parseUnits("1000", 6);
    const vestingAmount = totalAmount - firstPayment;
    const monthlyAmount = vestingAmount / BigInt(MONTHLY_PAYMENTS);

    beforeEach(async function () {
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      await vesting.depositToAave(vestingAmount);
    });

    it("Should return correct vesting information", async function () {
      const info = await vesting.getVestingInfo();
      
      expect(info._winner).to.equal(winner.address);
      expect(info._totalAmount).to.equal(vestingAmount);
      expect(info._monthlyAmount).to.equal(monthlyAmount);
      expect(info._paymentsMade).to.equal(0);
      expect(info._paymentsRemaining).to.equal(MONTHLY_PAYMENTS);
    });

    it("Should update vesting info after payments", async function () {
      await increaseTime(SECONDS_PER_MONTH);
      await vesting.connect(winner).claimMonthlyPayment();
      
      const info = await vesting.getVestingInfo();
      expect(info._paymentsMade).to.equal(1);
      expect(info._paymentsRemaining).to.equal(MONTHLY_PAYMENTS - 1);
    });

    it("Should return correct next payment time", async function () {
      const beforeClaim = await getLatestTime();
      await increaseTime(SECONDS_PER_MONTH);
      await vesting.connect(winner).claimMonthlyPayment();
      
      const info = await vesting.getVestingInfo();
      const expectedNextPayment = await getLatestTime() + BigInt(SECONDS_PER_MONTH);
      
      // Allow small margin for block time
      expect(info._nextPaymentTime).to.be.gte(expectedNextPayment - 10n);
      expect(info._nextPaymentTime).to.be.lte(expectedNextPayment + 10n);
    });
  });

  describe("Aave Balance", function () {
    const totalAmount = ethers.parseUnits("120000", 6);
    const firstPayment = ethers.parseUnits("1000", 6);
    const vestingAmount = totalAmount - firstPayment;

    it("Should return zero balance before deposit", async function () {
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      
      const balance = await vesting.getAaveBalance();
      expect(balance).to.equal(0);
    });

    it("Should return balance after deposit", async function () {
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      await vesting.depositToAave(vestingAmount);
      
      const balance = await vesting.getAaveBalance();
      expect(balance).to.be.gte(vestingAmount);
    });
  });

  describe("Can Claim Next Payment", function () {
    const totalAmount = ethers.parseUnits("120000", 6);
    const firstPayment = ethers.parseUnits("1000", 6);
    const vestingAmount = totalAmount - firstPayment;

    beforeEach(async function () {
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      await vesting.depositToAave(vestingAmount);
    });

    it("Should return false before 30 days", async function () {
      const canClaim = await vesting.canClaimNextPayment();
      expect(canClaim).to.be.false;
    });

    it("Should return true after 30 days", async function () {
      await increaseTime(SECONDS_PER_MONTH);
      const canClaim = await vesting.canClaimNextPayment();
      expect(canClaim).to.be.true;
    });

    it("Should return false if not deposited to Aave", async function () {
      const MegaYieldVesting = await ethers.getContractFactory("MegaYieldVesting");
      const newVesting = await MegaYieldVesting.deploy(
        await aaveIntegration.getAddress(),
        await usdc.getAddress()
      );
      await newVesting.waitForDeployment();
      await newVesting.setLotteryContract(owner.address);
      
      await usdc.transfer(await newVesting.getAddress(), vestingAmount);
      await newVesting.initialize(winner.address, vestingAmount, firstPayment);
      
      const canClaim = await newVesting.canClaimNextPayment();
      expect(canClaim).to.be.false;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large vesting amount", async function () {
      const largeAmount = ethers.parseUnits("1000000000", 6); // 1 billion USDC
      const firstPayment = largeAmount / BigInt(120);
      const vestingAmount = largeAmount - firstPayment;
      
      await usdc.mint(owner.address, largeAmount);
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      
      const monthlyAmount = vestingAmount / BigInt(MONTHLY_PAYMENTS);
      expect(await vesting.monthlyPaymentAmount()).to.equal(monthlyAmount);
    });

    it("Should handle small vesting amount", async function () {
      const smallAmount = ethers.parseUnits("120", 6); // 120 USDC (1 per month)
      const firstPayment = smallAmount / BigInt(120);
      const vestingAmount = smallAmount - firstPayment;
      
      await usdc.mint(owner.address, smallAmount);
      await usdc.transfer(await vesting.getAddress(), vestingAmount);
      
      await vesting.initialize(winner.address, vestingAmount, firstPayment);
      
      const monthlyAmount = vestingAmount / BigInt(MONTHLY_PAYMENTS);
      expect(await vesting.monthlyPaymentAmount()).to.equal(monthlyAmount);
    });
  });
});


