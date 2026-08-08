import * as NFTGrowth from "@/contracts/NFTGrowth.json"
import { defineConfig } from "@wagmi/cli"
import { react } from "@wagmi/cli/plugins"
import { Abi } from "viem"

export default defineConfig({
  out: "contracts/generated.ts",
  contracts: [{ name: "NFTGrowth", abi: NFTGrowth.abi as Abi }],
  plugins: [react()],
})
