import { Address, ByteArray, getContract, WalletClient, encodeFunctionData, parseEventLogs } from "viem";
import { HermesClient, type PriceUpdate } from "@pythnetwork/hermes-client";
import ipythAbi from "./abis/IPyth.json";
import lendingPoolAbi from "./abis/LendingPool.json";
import { LENDING_POOL_ADDRESS } from "./fund";

const connection = new HermesClient("https://hermes.pyth.network", {});

// Check if wallet supports atomic batch transactions
export async function getWalletCapabilities(walletClient: WalletClient) {
  try {
    const currChainId = await walletClient.transport.request({ method: "eth_chainId" }) as string;
    const capabilities = await walletClient.request({
      method: "wallet_getCapabilities",
      params: [
        walletClient.account?.address as Address,
        [currChainId as `0x${string}`] 
      ],
    });
    
    console.log("Wallet capabilities:", capabilities);
    return capabilities;
  } catch (error) {
    console.error("Failed to get wallet capabilities:", error);
    return null;
  }
}

// Get Hermes price update data
async function getHermesPriceUpdate(priceIds: string[]): Promise<PriceUpdate> {
  const priceUpdates = await connection.getLatestPriceUpdates(priceIds);
  return priceUpdates as unknown as PriceUpdate;
}

// Send batch transaction for updating prices and borrowing
export async function smartBorrow(
  amount: bigint,
  walletClient: WalletClient
): Promise<{ status: boolean; batchId?: string; positionId?: number }> {
  try {
    // First, check if wallet supports atomic batch transactions
    const capabilities = await getWalletCapabilities(walletClient);
    const currChainId = await walletClient.transport.request({ method: "eth_chainId" }) as string;
    if (!capabilities || !capabilities[currChainId as `0x${string}`]?.atomic?.status) {
      throw new Error("Atomic batch transactions not supported by this wallet");
    }

    // Get price IDs from lending pool contract
    const lendingPoolContract = getContract({
      address: LENDING_POOL_ADDRESS,
      abi: lendingPoolAbi,
      client: walletClient,
    });

    const [basePriceId, quotePriceId] = await Promise.all([
      lendingPoolContract.read.baseTokenPriceId() as Promise<ByteArray>,
      lendingPoolContract.read.quoteTokenPriceId() as Promise<ByteArray>,
    ]);

    // Get Hermes price update data
    const priceUpdates = await getHermesPriceUpdate([
      basePriceId.toString(),
      quotePriceId.toString(),
    ]);

    const priceUpdateHex = "0x" + priceUpdates.binary.data[0];

    // Get update fee from Pyth contract
    const pythContract = getContract({
      address: process.env.NEXT_PUBLIC_PYTH_ADDRESS as Address,
      abi: ipythAbi,
      client: walletClient,
    });

    const fee = await pythContract.read.getUpdateFee([[priceUpdateHex]]) as bigint;

    // Prepare batch calls using encodeFunctionData
    const calls = [
      {
        to: process.env.NEXT_PUBLIC_PYTH_ADDRESS as Address,
        value: `0x${fee.toString(16)}` as `0x${string}`,
        data: encodeFunctionData({
          abi: ipythAbi,
          functionName: 'updatePriceFeeds',
          args: [[priceUpdateHex]]
        }),
      },
      {
        to: LENDING_POOL_ADDRESS,
        value: "0x0" as `0x${string}`,
        data: encodeFunctionData({
          abi: lendingPoolAbi,
          functionName: 'borrow',
          args: [amount]
        }),
      },
    ];

    // Send batch transaction
    const result = await walletClient.request({
      method: "wallet_sendCalls",
      params: [
        {
          version: "2.0.0",
          from: walletClient.account?.address as Address,
          chainId: currChainId as `0x${string}`, // Base chain ID in hex
          atomicRequired: true,
          calls: calls,
        },
      ],
    });

    console.log("Batch transaction result:", result);
    
    // Check if result has an id property (successful batch submission)
    if (!result || typeof result === 'boolean' || typeof result === 'string' || !('id' in (result as any))) {
      throw new Error("Failed to submit batch transaction");
    }
    
    const batchResult = result as { id: string };
    
    // Track the status of the batch
    const status = await trackBatchStatus(batchResult.id, walletClient);
    
    if (status.status !== 200 && status.receipts.length === 0) {
        throw new Error("Failed to submit batch transaction");
    } else if (status.status === 200 || status.status === 100 && status.receipts.length > 0) {
      // Parse the borrow event from the receipt to get position ID
      const borrowReceipt = status.receipts[status.receipts.length - 1]; // Last receipt should be the borrow
      const positionId = parseBorrowEvent(borrowReceipt);
      
      return {
        status: true,
        batchId: batchResult.id,
        positionId: positionId,
      };
    }

    return { status: false };
  } catch (error) {
    console.error("Smart borrow failed:", error);
    return { status: false };
  }
}

// Track batch transaction status
async function trackBatchStatus(
  batchId: string,
  walletClient: WalletClient
): Promise<any> {
  try {
    const status = await walletClient.request({
      method: "wallet_getCallsStatus",
      params: [batchId],
    });
    
    console.log("Batch status:", status);
    return status;
  } catch (error) {
    console.error("Failed to track batch status:", error);
    throw error;
  }
}

// Parse borrow event from transaction receipt
function parseBorrowEvent(receipt: any): number | undefined {
  try {
    // Look for the Borrow event in the logs
    const logs = parseEventLogs({
        abi: lendingPoolAbi,
        eventName: 'Borrow',
        logs: receipt.logs,
      });

      const borrowLog = logs[0] as any;
      const positionId = borrowLog.args?.positionId;
      if (!positionId) {
        throw new Error("Position ID not found in Borrow event");
      }
      return Number(positionId);
  } catch (error) {
    console.error("Failed to parse borrow event:", error);
  }
  
  return undefined;
} 