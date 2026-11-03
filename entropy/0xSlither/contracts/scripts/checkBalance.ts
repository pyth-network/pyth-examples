import { ethers } from "hardhat";

async function main() {
  const gameTokenAddress = process.env.GAME_TOKEN_ADDRESS;
  
  if (!gameTokenAddress) {
    console.error("Please set GAME_TOKEN_ADDRESS in .env");
    process.exit(1);
  }

  const address = process.argv[2];

  if (!address) {
    console.error("Usage: npx hardhat run scripts/checkBalance.ts --network saga -- <address>");
    process.exit(1);
  }

  const GameToken = await ethers.getContractAt("GameToken", gameTokenAddress);
  
  const balance = await GameToken.balanceOf(address);
  const symbol = await GameToken.symbol();
  
  console.log("Address:", address);
  console.log("Balance:", Math.floor(parseFloat(ethers.formatEther(balance))), symbol);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

