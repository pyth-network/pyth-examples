import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BattlefieldModule", (m) => {
  // https://docs.pyth.network/price-feeds/core/contract-addresses/evm
  const pythAddress = "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729"; // Base Sepolia

  // https://docs.pyth.network/entropy/contract-addresses
  const entropyAddress = "0x41c9e39574f40ad34c79f1c99b66a45efb830d4c"; // Base Sepolia

  const battlefield = m.contract("Battlefield", [pythAddress, entropyAddress]);

  return { battlefield };
});
