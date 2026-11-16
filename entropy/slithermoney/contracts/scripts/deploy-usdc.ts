import { network } from "hardhat";

const { viem } = await network.connect();
const client = await viem.getPublicClient();

const chainId = Number(await client.getChainId());
console.log(`Deploying USDC on chain ID: ${chainId}`);

// Deploy USDC contract
const usdc = await viem.deployContract("USDC", []);
console.log("USDC address:", usdc.address);

// Get deployer address
const [deployer] = await viem.getWalletClients();
const deployerAddress = deployer.account.address;
console.log("Deployer address:", deployerAddress);

// Mint 1000 USDC (with 6 decimals = 1000 * 10^6) to deployer
const mintAmount = BigInt(1000 * 1e6);
const mintTx = await usdc.write.mint([deployerAddress, mintAmount]);
await client.waitForTransactionReceipt({ hash: mintTx });
console.log(`Minted 1000 USDC to ${deployerAddress}`);

console.log("\n✅ USDC deployment complete!");
console.log(`USDC Contract Address: ${usdc.address}`);
console.log(`Deployer Address: ${deployerAddress}`);
console.log(`Minted Amount: 1000 USDC`);


