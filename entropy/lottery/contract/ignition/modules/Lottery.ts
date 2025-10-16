import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const LotteryModule = buildModule("LotteryModule", (m) => {
  const EntropyAddress = "0x98046Bd286715D3B0BC227Dd7a956b83D8978603";
  const ProviderAddress = "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344";
  const TicketPrice = parseEther("0.001");

  const lottery = m.contract("Lottery", [
    EntropyAddress,
    ProviderAddress,
    TicketPrice,
  ]);

  return {
    lottery,
  };
});

export default LotteryModule;
