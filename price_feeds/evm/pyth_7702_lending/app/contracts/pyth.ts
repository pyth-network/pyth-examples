import { Address, getContract } from "viem";
import ipythAbi from "./abis/IPyth.json";
import { HermesClient, type PriceUpdate } from "@pythnetwork/hermes-client";
import { WalletClient } from "viem";




const connection = new HermesClient("https://hermes.pyth.network", {});


export async function updatePrices(priceIds: string[], walletClient: WalletClient): Promise<boolean> {
  const contract = getContract({
    address: process.env.NEXT_PUBLIC_PYTH_ADDRESS as Address,
    abi: ipythAbi,
    client: walletClient,
  });
  const priceUpdates = await getHermesPriceUpdate(priceIds);
  console.log("priceUpdates", priceUpdates);
  const priceUpdateHex = "0x" + priceUpdates.binary.data[0];
  console.log("priceUpdateHex", priceUpdateHex);
  const fee = await contract.read.getUpdateFee([[priceUpdateHex]]);
  console.log("fee", fee);
  const tx = await contract.write.updatePriceFeeds([[priceUpdateHex]], {
    account: walletClient.account,
    value: fee,
  });
  if (tx) {
    console.log("tx", tx);
    return true;
  }
  return false;
}


async function getHermesPriceUpdate(priceIds: string[]): Promise<PriceUpdate> {
  // Latest price updates
  const priceUpdates = await connection.getLatestPriceUpdates(priceIds);
  return priceUpdates as unknown as PriceUpdate;
}