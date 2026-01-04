import { ethers } from "hardhat";

async function main() {
  const stakeArenaAddress = process.env.STAKE_ARENA_ADDRESS;
  
  if (!stakeArenaAddress) {
    console.error("Please set STAKE_ARENA_ADDRESS in .env");
    process.exit(1);
  }

  console.log("Fetching on-chain leaderboard...");
  console.log("StakeArena:", stakeArenaAddress);

  const StakeArena = await ethers.getContractAt("StakeArena", stakeArenaAddress);
  const leaderboard = await StakeArena.getLeaderboard();

  console.log("\n📊 On-Chain Leaderboard:");
  console.log("========================");
  
  if (leaderboard.length === 0) {
    console.log("No entries yet");
  } else {
    leaderboard.forEach((entry: any, index: number) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      console.log(`${medal} ${index + 1}. ${entry.player} - Score: ${entry.score}`);
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

