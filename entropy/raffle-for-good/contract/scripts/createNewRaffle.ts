import { JsonRpcProvider, Wallet, Contract } from "ethers";
import * as dotenv from "dotenv";
import RaffleFactoryArtifact from "../artifacts/contracts/RaffleFactory.sol/RaffleFactory.json" assert { type: "json" };

// Factory address desplegado
const FACTORY_ADDRESS = "0x104032d5377be9b78441551e169f3C8a3d520672";

// Parámetros de la nueva rifa
const RAFFLE_NAME = "Test Raffle Quick Close";
const RAFFLE_DESCRIPTION = "Rifa de prueba que se puede cerrar inmediatamente";
const PROJECT_PERCENTAGE = 3000; // 30% para el proyecto
const PROJECT_ADDRESS = "0x611a9571F763952605cA631d3B0F346a568ab3e1"; // Tu dirección
const RAFFLE_DURATION = 7 * 24 * 60 * 60; // 7 días (aunque ya no importa con la modificación)

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

  console.log(`🏭 Creando nueva rifa con Factory: ${FACTORY_ADDRESS}`);
  console.log(`👤 Desde cuenta: ${wallet.address}`);
  console.log("");

  // 2. Conectar al Factory
  const factory = new Contract(
    FACTORY_ADDRESS,
    RaffleFactoryArtifact.abi,
    wallet
  );

  console.log("📋 Parámetros de la rifa:");
  console.log(`   Nombre: ${RAFFLE_NAME}`);
  console.log(`   Descripción: ${RAFFLE_DESCRIPTION}`);
  console.log(`   % Proyecto: ${PROJECT_PERCENTAGE / 100}%`);
  console.log(`   Dirección Proyecto: ${PROJECT_ADDRESS}`);
  console.log(`   Duración: ${RAFFLE_DURATION} segundos`);
  console.log("");

  // 3. Crear la rifa
  console.log("🚀 Creando rifa...");
  
  const tx = await factory.createRaffle(
    RAFFLE_NAME,
    RAFFLE_DESCRIPTION,
    PROJECT_PERCENTAGE,
    PROJECT_ADDRESS,
    RAFFLE_DURATION
  );
  
  console.log(`📝 Transacción enviada: ${tx.hash}`);
  console.log("⏳ Esperando confirmación...");
  
  const receipt = await tx.wait();
  console.log(`✅ Confirmada en el bloque ${receipt?.blockNumber}`);
  console.log("");

  // 4. Buscar el evento RaffleCreated
  const raffleCreatedEvent = receipt?.logs
    .map((log: any) => {
      try {
        return factory.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
      } catch {
        return null;
      }
    })
    .find((event: any) => event?.name === "RaffleCreated");

  if (raffleCreatedEvent) {
    const newRaffleAddress = raffleCreatedEvent.args.raffleAddress;
    console.log("🎉 ¡Rifa creada exitosamente!");
    console.log("");
    console.log("📍 NUEVA DIRECCIÓN DE LA RIFA:");
    console.log(`   ${newRaffleAddress}`);
    console.log("");
    console.log("📋 Próximos pasos:");
    console.log(`   1. Comprar tickets: modifica buyTickets.ts con la dirección ${newRaffleAddress}`);
    console.log(`   2. Cerrar rifa: modifica closeRaffle.ts con la dirección ${newRaffleAddress}`);
    console.log(`   3. Distribuir fondos: modifica distributeFunds.ts con la dirección ${newRaffleAddress}`);
  } else {
    console.log("⚠️  No se encontró el evento RaffleCreated");
    
    // Obtener el último raffle creado
    const raffleCount = await factory.getRaffleCount();
    console.log(`📊 Total de raffles: ${raffleCount}`);
    
    if (raffleCount > 0n) {
      const lastRaffleIndex = raffleCount - 1n;
      const raffleInfo = await factory.getRaffleInfo(lastRaffleIndex);
      console.log(`📍 Última rifa creada: ${raffleInfo[0]}`);
    }
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});

