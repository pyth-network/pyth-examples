import { LENDING_POOL_ADDRESS } from "./fund";
import { parseEventLogs, WalletClient } from "viem";
import { getContract, parseAbiItem, decodeEventLog } from "viem";
import lendingPoolAbi from "./abis/LendingPool.json";
import { Address } from "viem";
import { erc20Abi } from "viem";
import { publicClient } from "./tokens";

export async function borrow(amount: bigint, walletClient: WalletClient): Promise<{status: boolean, positionId: number}> {
  const contract = getContract({
    address: LENDING_POOL_ADDRESS,
    abi: lendingPoolAbi,
    client: walletClient,
  });
  const txHash = await contract.write.borrow([amount], {
    account: walletClient.account,
  });
  console.log("txHash", txHash);
  
  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Transaction receipt:", receipt);
  if (receipt.status !== "success") {
    throw new Error("Borrow failed");
  }

  const logs = parseEventLogs({
    abi: lendingPoolAbi,
    eventName: 'Borrow',
    logs: receipt.logs,
  });
  console.log("Logs:", logs);
  
  if (logs.length === 0) {
    throw new Error("Borrow event not found in transaction logs");
  }
  
  const borrowLog = logs[0] as any;
  const positionId = borrowLog.args?.positionId;
  if (!positionId) {
    throw new Error("Position ID not found in Borrow event");
  }
  
  return {status: receipt.status === "success", positionId: Number(positionId)};
}




export async function repay(positionId: number, walletClient: WalletClient): Promise<{status: boolean}> {
  const contract = getContract({
    address: LENDING_POOL_ADDRESS,
    abi: lendingPoolAbi,
    client: walletClient,
  });
  const txHash = await contract.write.repay([positionId], {
    account: walletClient.account,
  });
  console.log("Repay txHash", txHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Repay receipt", receipt);
  return {status: receipt.status === "success"};
}

export async function getPosition(positionId: number, walletClient: WalletClient): Promise<{status: boolean, position: any}> {
  const contract = getContract({
    address: LENDING_POOL_ADDRESS,
    abi: lendingPoolAbi,
    client: walletClient,
  });
  const position = await contract.read.positions([positionId]);
  return {status: true, position: position};
}

export async function getTotalPositions(walletClient: WalletClient): Promise<number> {
  const contract = getContract({
    address: LENDING_POOL_ADDRESS,
    abi: lendingPoolAbi,
    client: walletClient,
  });
  const positions = await contract.read.numPositions();
  return Number(positions);
}

export interface Position {
  positionId: number;
  taker: string;
  amount: bigint;
  collateral: bigint;
}

export async function getUserPositions(walletClient: WalletClient): Promise<Position[]> {
  const contract = getContract({
    address: LENDING_POOL_ADDRESS,
    abi: lendingPoolAbi,
    client: walletClient,
  });
  
  if (!walletClient.account?.address) {
    throw new Error("Wallet account address is undefined");
  }
  
  const userAddress = walletClient.account.address;
  const totalPositions = await contract.read.numPositions();
  const userPositions: Position[] = [];
  
  // Iterate through all positions to find user's positions
  for (let i = 0; i < Number(totalPositions); i++) {
          try {
        const position = await contract.read.positions([i]) as any;
        if (position && position[0] === userAddress) {
          userPositions.push({
            positionId: i,
            taker: position[0],
            amount: position[1],
            collateral: position[2],
          });
        }
      } catch (error) {
      console.error(`Error fetching position ${i}:`, error);
      // Continue with next position
    }
  }
  console.log("User positions:", userPositions);
  
  return userPositions;
}