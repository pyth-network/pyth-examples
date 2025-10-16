import LotteryAbi from "@/contracts/Lottery.json"
import { defineConfig } from "@wagmi/cli"
import { react } from "@wagmi/cli/plugins"
import { Abi } from "viem"

export default defineConfig({
  out: "contracts/generated.ts",
  contracts: [{ name: "Lottery", abi: LotteryAbi as Abi }],
  plugins: [react()],
})
