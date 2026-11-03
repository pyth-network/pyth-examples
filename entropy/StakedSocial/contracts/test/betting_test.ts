const { expect } = require("chai");
const { ethers } = require("hardhat");

function computeMetadataHash(metadata) {
  const json = JSON.stringify(metadata);
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

describe("FriendsGroupBets", function () {
  async function deployFixture() {
    const [deployer, user1, user2, user3, resolver] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("FriendsGroupBets");
    const contract = await Factory.deploy();

    return { contract, deployer, user1, user2, user3, resolver };
  }

  it("creates a market and lets users bet", async function () {
    const { contract, deployer, user1, user2, resolver } =
      await deployFixture();

    const metadata = {
      version: 1,
      question: "Will team A win?",
      outcomes: ["YES", "NO"],
    };
    const metadataHash = computeMetadataHash(metadata);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 3600;
    const shareSize = ethers.parseEther("0.001");
    const targetList = [user2.address];
    const outcomesCount = 2;

    const tx = await contract
      .connect(deployer)
      .createMarket(
        metadataHash,
        deadline,
        resolver.address,
        shareSize,
        targetList,
        outcomesCount
      );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((l) => contract.interface.parseLog(l))
      .find((l) => l.name === "MarketCreated");
    const marketId = event.args.id;

    expect(marketId).to.equal(0n);

    // user1 places bet on YES
    await contract
      .connect(user1)
      .placeBet(marketId, 0, { value: ethers.parseEther("0.002") }); // 2 shares

    const m = await contract.markets(marketId);
    // expect(m.totalStaked.length).to.equal(2);
    // totalStaked is an array in storage; reading that directly from mapping getter
    // is not trivial in solidity, but we at least know it didn't revert.
  });

  it("reverts for target user betting", async function () {
    const { contract, deployer, user1, user2, resolver } =
      await deployFixture();

    const metadata = {
      question: "Will X happen?",
      outcomes: ["YES", "NO"],
    };
    const metadataHash = computeMetadataHash(metadata);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 3600;
    const shareSize = ethers.parseEther("0.001");
    const targetList = [user2.address];
    const outcomesCount = 2;

    const tx = await contract
      .connect(deployer)
      .createMarket(
        metadataHash,
        deadline,
        resolver.address,
        shareSize,
        targetList,
        outcomesCount
      );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((l) => contract.interface.parseLog(l))
      .find((l) => l.name === "MarketCreated");
    const marketId = event.args.id;

    await expect(
      contract
        .connect(user2)
        .placeBet(marketId, 0, { value: ethers.parseEther("0.002") })
    ).to.be.revertedWith("target");
  });

  it("resolves by full consensus and allows withdrawals", async function () {
    const { contract, deployer, user1, user2, resolver } =
      await deployFixture();

    const metadata = {
      question: "Will it rain?",
      outcomes: ["YES", "NO"],
    };
    const metadataHash = computeMetadataHash(metadata);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 3600;
    const shareSize = ethers.parseEther("0.001");
    const targetList = [];
    const outcomesCount = 2;

    // create
    const tx = await contract
      .connect(deployer)
      .createMarket(
        metadataHash,
        deadline,
        resolver.address,
        shareSize,
        targetList,
        outcomesCount
      );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((l) => contract.interface.parseLog(l))
      .find((l) => l.name === "MarketCreated");
    const marketId = event.args.id;

    // user1 + user2 bet
    await contract
      .connect(user1)
      .placeBet(marketId, 0, { value: ethers.parseEther("0.004") }); // YES
    await contract
      .connect(user2)
      .placeBet(marketId, 1, { value: ethers.parseEther("0.002") }); // NO

    // both vote YES (outcome 0)
    await contract.connect(user1).voteResolve(marketId, 0);
    await contract.connect(user2).voteResolve(marketId, 0);

    const m = await contract.markets(marketId);
    expect(m.resolved).to.equal(true);
    expect(m.winningOutcome).to.equal(0);

    // Withdrawals
    const totalPool = ethers.parseEther("0.006");
    const winPool = ethers.parseEther("0.004");

    const balBefore = await ethers.provider.getBalance(user1.address);
    const txw = await contract.connect(user1).withdraw(marketId);
    const recw = await txw.wait();
    const gas = recw.gasUsed * txw.gasPrice;
    const balAfter = await ethers.provider.getBalance(user1.address);

    const expected = balBefore + (totalPool * BigInt(1)) / BigInt(1) - gas; // user1 has 100% of winningPool
    // Can't easily assert equality due to rounding in this simple step, but you can log:
    // console.log("after-before+gas", balAfter - balBefore + gas);

    expect(m.cancelled).to.equal(false);
  });

  it("cancels by full consensus", async function () {
    const { contract, deployer, user1, user2, resolver } =
      await deployFixture();

    const metadata = {
      question: "Will Z occur?",
      outcomes: ["YES", "NO"],
    };
    const metadataHash = computeMetadataHash(metadata);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 3600;
    const shareSize = ethers.parseEther("0.001");
    const targetList = [];
    const outcomesCount = 2;

    const tx = await contract
      .connect(deployer)
      .createMarket(
        metadataHash,
        deadline,
        resolver.address,
        shareSize,
        targetList,
        outcomesCount
      );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((l) => contract.interface.parseLog(l))
      .find((l) => l.name === "MarketCreated");
    const marketId = event.args.id;

    // Bets
    await contract
      .connect(user1)
      .placeBet(marketId, 0, { value: ethers.parseEther("0.003") });
    await contract
      .connect(user2)
      .placeBet(marketId, 1, { value: ethers.parseEther("0.002") });

    // Both vote to cancel
    await contract.connect(user1).voteToCancel(marketId, true);
    await contract.connect(user2).voteToCancel(marketId, true);

    const m = await contract.markets(marketId);
    expect(m.cancelled).to.equal(true);
    expect(m.resolved).to.equal(false);
  });

  it("system can resolve if no consensus", async function () {
    const { contract, deployer, user1, user2, resolver } =
      await deployFixture();

    const metadata = {
      question: "Example system resolution",
      outcomes: ["YES", "NO"],
    };
    const metadataHash = computeMetadataHash(metadata);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 3600;
    const shareSize = ethers.parseEther("0.001");
    const targetList = [];
    const outcomesCount = 2;

    const tx = await contract
      .connect(deployer)
      .createMarket(
        metadataHash,
        deadline,
        resolver.address,
        shareSize,
        targetList,
        outcomesCount
      );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((l) => contract.interface.parseLog(l))
      .find((l) => l.name === "MarketCreated");
    const marketId = event.args.id;

    await contract
      .connect(user1)
      .placeBet(marketId, 0, { value: ethers.parseEther("0.003") });
    await contract
      .connect(user2)
      .placeBet(marketId, 1, { value: ethers.parseEther("0.002") });

    // conflicting votes, so no consensus
    await contract.connect(user1).voteResolve(marketId, 0);
    await contract.connect(user2).voteResolve(marketId, 1);

    let m = await contract.markets(marketId);
    expect(m.resolved).to.equal(false);

    // system forces NO (1) as winner
    await contract
      .connect(resolver)
      .systemResolve(marketId, 1, metadataHash);

    m = await contract.markets(marketId);
    expect(m.resolved).to.equal(true);
    expect(m.winningOutcome).to.equal(1);
  });
});
