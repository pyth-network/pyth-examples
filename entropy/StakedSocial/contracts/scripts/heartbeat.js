const hre = require("hardhat");

async function main() {
  const addr = "0xB0bD3b5D742FF7Ce8246DE6e650085957BaAC852";

  const code = await hre.ethers.provider.getCode(addr);

  if (code === "0x") {
    console.log("NO");
  } else {
    console.log("YES");
  }
}

main();