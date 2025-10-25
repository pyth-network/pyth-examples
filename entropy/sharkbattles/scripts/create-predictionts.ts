import { network } from "hardhat";
import { battleEnd, battleStart } from "./data/battle.js";
import { battlefieldAbi, battlefieldAddress } from "./data/battlefield.js";
import { predictions } from "./data/predictions.js";

async function main() {
  console.log("Creating predictions...");

  // Init viem clients
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  // Create predictions
  for (const prediction of predictions) {
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: battlefieldAddress,
      abi: battlefieldAbi,
      functionName: "createPrediction",
      args: [
        battleStart,
        battleEnd,
        prediction.creatorFid,
        prediction.priceFeedId,
      ],
    });
    const tx = await walletClient.writeContract(request);
    console.log("tx:", tx);
  }

  console.log("Predictions created");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
