// scripts/arcade_fund.ts
import hre from "hardhat";
const { ethers } = hre;

/**
 * Usage:
 *   pnpm hardhat run --network baseSepolia scripts/arcade_fund.ts -- <ARCADE_ADDR> <AMOUNT_ETH>
 *
 * Examples:
 *   pnpm hardhat run --network baseSepolia scripts/arcade_fund.ts -- 0xABC... 0.2
 *   # or set envs:
 *   ARCADE_ADDR=0xABC... AMOUNT_ETH=0.2 pnpm hardhat run --network baseSepolia scripts/arcade_fund.ts
 */

async function main() {
  const addr =
    process.argv[2] ||
    process.env.ARCADE_ADDR ||
    (() => {
      throw new Error("Missing ARCADE_ADDR (arg1) — pass as CLI arg or env");
    })();

  const amount =
    process.argv[3] ||
    process.env.AMOUNT_ETH ||
    (() => {
      throw new Error("Missing AMOUNT_ETH (arg2) — pass as CLI arg or env");
    })();

  const [signer] = await ethers.getSigners();
  console.log("Funding from:", signer.address);
  console.log("To contract:", addr);
  console.log("Amount (ETH):", amount);

  const tx = await signer.sendTransaction({
    to: addr,
    value: ethers.parseEther(amount),
  });
  console.log("Sent tx:", tx.hash);
  await tx.wait();

  const bal = await ethers.provider.getBalance(addr);
  console.log("Contract balance (wei):", bal.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
