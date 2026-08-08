import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import "dotenv/config";
import ChaosHookAbi from "../out/ChaosHook.sol/ChaosHook.json";

const NETWORK = process.env.NETWORK ?? "base-sepolia";
const DEPLOYMENT_PATH =
  process.env.DEPLOYMENT_PATH ??
  path.join(__dirname, "..", "deployments", `${NETWORK}.json`);

const RPC_URL = process.env.BASE_RPC!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const PRICE_FEED_ID =
  "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";

interface DeploymentJSON {
  poolManager: string;
  token0: string;
  token1: string;
  chaosHook: string;
  entropy: string;
  pyth: string;
}

const raw = fs.readFileSync(DEPLOYMENT_PATH, "utf8");
const jsonPool: DeploymentJSON = JSON.parse(raw);

const CHAOS_HOOK = process.env.CHAOS_HOOK ?? jsonPool.chaosHook;

async function main() {
  console.log("🚀 Using network:", NETWORK);
  console.log("📁 Deployment file:", DEPLOYMENT_PATH);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const chaos = new ethers.Contract(CHAOS_HOOK, ChaosHookAbi.abi, wallet);

  // 1) Fetch price updates from Hermes
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PRICE_FEED_ID}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Hermes fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const data: string[] = json.binary.data.map((hex: string) => "0x" + hex);

  const pythFee = await chaos.pyth().then((pythAddr: string) => {
    const pyth = new ethers.Contract(
      pythAddr,
      [
        "function getUpdateFee(bytes[] calldata) external view returns (uint256)",
      ],
      provider
    );
    return pyth.getUpdateFee(data);
  });

  const entropyAddr: string = await chaos.entropy();
  const entropy = new ethers.Contract(
    entropyAddr,
    ["function getFeeV2() external view returns (uint128)"],
    provider
  );
  const entropyFee = await entropy.getFeeV2();

  const totalFee = pythFee + entropyFee;
  console.log("💰 Pyth fee:", pythFee.toString());
  console.log("🎲 Entropy fee:", entropyFee.toString());
  console.log("📦 totalFee:", totalFee.toString());

  // poolKey must mirror what you used in the deploy script
  const poolKey = {
    currency0: jsonPool.token0,
    currency1: jsonPool.token1,
    fee: 3000,
    tickSpacing: 10,
    hooks: CHAOS_HOOK,
  };

  const tx = await chaos.requestChaosWithPyth(
    poolKey,
    data,
    60, // maxAgeSec
    { value: totalFee }
  );
  console.log("📨 Chaos tx:", tx.hash);

  await tx.wait();
  console.log("Chaos LP request mined");

  console.log("✅ Chaos LP request mined on Base Sepolia!");
}

main().catch(console.error);

// ts-node scripts/requestChaos.ts
