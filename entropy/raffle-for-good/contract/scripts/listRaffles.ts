import { JsonRpcProvider, Wallet, Contract } from "ethers";
import * as dotenv from "dotenv";
import RaffleFactoryArtifact from "../artifacts/contracts/RaffleFactory.sol/RaffleFactory.json" assert { type: "json" };

// Factory address actualizado
const FACTORY_ADDRESS = "0x104032d5377be9b78441551e169f3C8a3d520672";

dotenv.config();

async function main() {
  // 1. Setup de conexión
  const rpcUrl =
    process.env.BASE_SEPOLIA_RPC_URL ??
    process.env.SEPOLIA_RPC_URL ??
    process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing BASE_SEPOLIA_RPC_URL/SEPOLIA_RPC_URL/RPC_URL");
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in environment");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  console.log(`🏭 Factory Address: ${FACTORY_ADDRESS}`);
  console.log(`👤 Tu cuenta: ${wallet.address}`);
  console.log("");

  // 2. Conectar al Factory
  const factory = new Contract(
    FACTORY_ADDRESS,
    RaffleFactoryArtifact.abi,
    provider
  );

  // 3. Obtener información del factory
  const raffleCount = await factory.getRaffleCount();
  const owner = await factory.owner();
  const entropyAddress = await factory.entropyAddress();

  console.log("📊 Información del Factory:");
  console.log(`   Owner: ${owner}`);
  console.log(`   Entropy Address: ${entropyAddress}`);
  console.log(`   Total Rifas: ${raffleCount.toString()}`);
  console.log("");

  if (raffleCount === 0n) {
    console.log("⚠️  No hay rifas creadas aún");
    return;
  }

  // 4. Listar todas las rifas
  console.log("📋 Lista de Rifas:");
  console.log("━".repeat(80));

  for (let i = 0; i < Number(raffleCount); i++) {
    const raffleInfo = await factory.getRaffleInfo(i);
    const raffleAddress = raffleInfo[0];
    const projectName = raffleInfo[1];
    const state = raffleInfo[2];
    const totalTickets = raffleInfo[3];
    const participantCount = raffleInfo[4];

    const stateText = state === 0n ? "🟢 Active" : state === 1n ? "🟡 EntropyRequested" : "🔴 DrawExecuted";

    console.log("");
    console.log(`#${i} - ${projectName}`);
    console.log(`   📍 Dirección: ${raffleAddress}`);
    console.log(`   ${stateText}`);
    console.log(`   🎫 Tickets vendidos: ${totalTickets.toString()} wei (${Number(totalTickets) / 1e18} ETH)`);
    console.log(`   👥 Participantes: ${participantCount.toString()}`);
  }

  console.log("");
  console.log("━".repeat(80));
  console.log("");
  console.log("💡 Comandos útiles:");
  console.log("   Ver detalles: modifica showRaffle.ts con la dirección que desees");
  console.log("   Comprar tickets: modifica buyTickets.ts con la dirección");
  console.log("   Cerrar rifa: modifica closeRaffle.ts con la dirección");
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});

