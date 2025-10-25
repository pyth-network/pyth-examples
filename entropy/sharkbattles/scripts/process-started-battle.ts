import { HermesClient } from "@pythnetwork/hermes-client";
import { network } from "hardhat";
import { parseEther } from "viem";
import { battleEnd, battleStart } from "./data/battle.js";
import { battlefieldAbi, battlefieldAddress } from "./data/battlefield.js";
import { priceFeedIds } from "./data/price-feeds.js";

async function main() {
  console.log("Process started battle...");

  // Get price update from Pyth Hermes
  const hermesClient = new HermesClient("https://hermes.pyth.network", {});
  const priceUpdates = await hermesClient.getLatestPriceUpdates(priceFeedIds);
  const priceUpdate = priceUpdates.binary.data.map((data) =>
    data.startsWith("0x") ? data : "0x" + data
  );

  // Init viem clients
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  // Process started battle
  const { request } = await publicClient.simulateContract({
    account: walletClient.account,
    address: battlefieldAddress,
    abi: battlefieldAbi,
    functionName: "processStartedBattle",
    args: [battleStart, battleEnd, priceUpdate as `0x${string}`[]],
    value: parseEther("0.0001"),
  });
  const tx = await walletClient.writeContract(request);
  console.log("tx:", tx);

  console.log("Started battle processed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
