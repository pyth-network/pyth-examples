const { ethers } = require("hardhat");
const {
  deployContract,
  getContractAt,
  computeMetadataHash,
  createMarket,
  placeBet,
  voteResolve,
  voteToCancel,
  systemResolve,
  systemCancel,
  withdraw,
} = require("./helpers");

async function main() {
  const [deployer, user1, user2, resolver] = await ethers.getSigners();

  // Deploy contract
  const contract = await deployContract();

  // Example metadata
  const metadata = {
    version: 1,
    question: "Will John ask Alice out?",
    outcomes: ["YES", "NO"],
  };

  const metadataHash = computeMetadataHash(metadata);
  const now = Math.floor(Date.now() / 1000);
  const deadline = BigInt(now + 3600); // 1h from now
  const shareSizeWei = ethers.parseEther("0.001"); // 0.001 ETH share
  const targetList = [user2.address]; // e.g. subject cannot bet
  const outcomesCount = 2;

  // Create market
  const marketId = await createMarket(contract.connect(deployer), {
    metadataHash,
    deadline,
    resolverAddr: resolver.address,
    shareSizeWei,
    targetList,
    outcomesCount,
  });

  // Bets
  await placeBet(
    contract.connect(user1),
    marketId,
    0, // YES
    ethers.parseEther("0.002") // 2 shares
  );

  // user2 is target, will revert if tries to bet

  // Votes
  await voteResolve(contract.connect(user1), marketId, 0);

  // system forced resolution (if consensus not complete etc.)
  // await systemResolve(contract.connect(resolver), marketId, 0, metadataHash);

  // Withdraw
  await withdraw(contract.connect(user1), marketId);

  console.log("Demo completed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
