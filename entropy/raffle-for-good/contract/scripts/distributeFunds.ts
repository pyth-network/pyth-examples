import { JsonRpcProvider, Wallet, Contract } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

// Dirección de la rifa donde distribuir fondos
const RAFFLE_ADDRESS = "0xAed632c4bF95AbA7550B6Dfb2E0E4072A3fB34e0";

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

  console.log(`💰 Distribuyendo fondos en: ${RAFFLE_ADDRESS}`);
  console.log(`👤 Desde cuenta: ${wallet.address}`);
  console.log("");

  // 2. Conectar al contrato de la rifa
  const raffle = new Contract(
    RAFFLE_ADDRESS,
    ProjectRaffleArtifact.abi,
    wallet
  );

  // 3. Verificar estado de la rifa
  const state = await raffle.state();
  const fundsDistributed = await raffle.fundsDistributed();
  const winner = await raffle.winner();
  const totalBalance = await raffle.getTotalBalance();

  console.log("📊 Estado actual de la rifa:");
  console.log(`   Estado: ${state === 0n ? "Active" : state === 1n ? "EntropyRequested" : "DrawExecuted"}`);
  console.log(`   Fondos distribuidos: ${fundsDistributed}`);
  console.log(`   Ganador: ${winner}`);
  console.log(`   Balance total: ${totalBalance.toString()} wei (${Number(totalBalance) / 1e18} ETH)`);
  console.log("");

  // 4. Validaciones
  if (state !== 2n) {
    throw new Error(`❌ El sorteo no ha sido ejecutado (estado: ${state})`);
  }

  if (fundsDistributed) {
    throw new Error("❌ Los fondos ya han sido distribuidos");
  }

  if (winner === "0x0000000000000000000000000000000000000000") {
    throw new Error("❌ No hay ganador seleccionado");
  }

  // 5. Obtener información de distribución
  const projectAddress = await raffle.projectAddress();
  const platformAdmin = await raffle.platformAdmin();
  const projectPercentage = await raffle.projectPercentage();
  const platformFee = await raffle.PLATFORM_FEE();
  const basisPoints = await raffle.BASIS_POINTS();

  console.log("📋 Información de distribución:");
  console.log(`   Proyecto: ${projectAddress}`);
  console.log(`   Administrador: ${platformAdmin}`);
  console.log(`   Ganador: ${winner}`);
  console.log(`   % Proyecto: ${(Number(projectPercentage) / Number(basisPoints)) * 100}%`);
  console.log(`   % Plataforma: ${(Number(platformFee) / Number(basisPoints)) * 100}%`);
  console.log("");

  // Calcular montos (igual que en el contrato)
  const platformAmount = (totalBalance * platformFee) / basisPoints;
  const distributablePool = totalBalance - platformAmount;
  const projectAmount = (distributablePool * projectPercentage) / basisPoints;
  const winnerAmount = distributablePool - projectAmount;

  console.log("💵 Montos a distribuir:");
  console.log(`   Proyecto: ${projectAmount.toString()} wei (${Number(projectAmount) / 1e18} ETH)`);
  console.log(`   Plataforma: ${platformAmount.toString()} wei (${Number(platformAmount) / 1e18} ETH)`);
  console.log(`   Ganador: ${winnerAmount.toString()} wei (${Number(winnerAmount) / 1e18} ETH)`);
  console.log("");

  // 6. Distribuir fondos
  console.log("🚀 Enviando transacción para distribuir fondos...");
  
  const tx = await raffle.distributeFunds();
  
  console.log(`📝 Transacción enviada: ${tx.hash}`);
  console.log("⏳ Esperando confirmación...");
  
  const receipt = await tx.wait();
  console.log(`✅ Confirmada en el bloque ${receipt?.blockNumber}`);
  console.log("");

  // 7. Buscar el evento FundsDistributed
  const fundsDistributedEvent = receipt?.logs
    .map((log: any) => {
      try {
        return raffle.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
      } catch {
        return null;
      }
    })
    .find((event: any) => event?.name === "FundsDistributed");

  if (fundsDistributedEvent) {
    console.log("🎉 ¡Fondos distribuidos exitosamente!");
    console.log("");
    console.log("📋 Próximo paso:");
    console.log("   Los beneficiarios deben llamar a withdrawPayments() para retirar sus fondos:");
    console.log(`   - Proyecto (${projectAddress})`);
    console.log(`   - Plataforma (${platformAdmin})`);
    console.log(`   - Ganador (${winner})`);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});

