const hre = require("hardhat");

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

  const RogueChain = await hre.ethers.getContractFactory("RogueChain");
  const rogueChain = await RogueChain.deploy(
    pythAddress,
    pythEntropyAddress,
    ethPriceId,
    btcPriceId
  );

  await rogueChain.waitForDeployment();

  console.log(`RogueChain deployed to: ${rogueChain.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
