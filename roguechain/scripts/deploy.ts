import { network } from "hardhat";

async function main() {
  console.log("Deploying RogueChain contract...");

  // Optimism Sepolia Adresleri (Pyth Docs'tan alındı)
  const pythAddress = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";
  const pythEntropyAddress = "0xE3Ee036f16560370F6eD31518f8444fC4Ca6E261";

  // Pyth Price ID'leri (Ana ağ ID'leri Sepolia'da da genellikle geçerlidir)
  // ETH/USD
  const ethPriceId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
  // BTC/USD
  const btcPriceId = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

  const { viem } = await network.connect({
    network: "optimismSepolia",
    chainType: "op",
  });

  const [deployerClient] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("Deploying with account:", deployerClient.account.address);

  // Get contract bytecode and ABI
  const contractArtifact = await import("../artifacts/contracts/RogueChain.sol/RogueChain.json");
  
  const hash = await deployerClient.deployContract({
    abi: contractArtifact.abi,
    bytecode: contractArtifact.bytecode,
    args: [pythAddress, pythEntropyAddress, ethPriceId, btcPriceId],
  });

  console.log("Deployment transaction hash:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.contractAddress) {
    console.log(`RogueChain deployed to: ${receipt.contractAddress}`);
  } else {
    console.error("Contract deployment failed");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
