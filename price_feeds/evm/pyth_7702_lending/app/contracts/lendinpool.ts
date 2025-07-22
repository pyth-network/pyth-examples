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

export async function approveToken(tokenAddress: Address, amount: bigint, walletClient: WalletClient): Promise<string> {
  const tokenContract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: walletClient,
  });
  if (!walletClient.account) {
    throw new Error("Wallet client account is undefined");
  }
  const txHash = await tokenContract.write.approve([LENDING_POOL_ADDRESS, amount], {
    account: walletClient.account,
    chain: walletClient.chain,
  });
  console.log("Approval txHash", txHash);
  return txHash;
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