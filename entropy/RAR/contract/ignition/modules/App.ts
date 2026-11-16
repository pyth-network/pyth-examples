import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AppModule = buildModule("AppModule", (m) => {
  const EntropyAddress = "0x549ebba8036ab746611b4ffa1423eb0a4df61440";
  const ProviderAddress = "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344";

  const randomSeed = m.contract("RandomSeed", [EntropyAddress]);
  const coinFlip = m.contract("CoinFlip", [EntropyAddress, ProviderAddress]);
  const playlistReputationNFT = m.contract("PlaylistReputationNFT", [EntropyAddress, ProviderAddress]);

  return {
    randomSeed,
    coinFlip,
    playlistReputationNFT
  };
});

export default AppModule;
