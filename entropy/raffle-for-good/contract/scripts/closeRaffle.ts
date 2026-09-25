import { JsonRpcProvider, Wallet, Contract, randomBytes, hexlify } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

// Dirección de la rifa que queremos cerrar
const RAFFLE_ADDRESS = "0x3374974DDE6eA5faAa5165cB21784279943C81a2";

dotenv.config();

// ABI mínima de IEntropyV2 para llamar a getFee
const ENTROPY_ABI = [
  "function getFee(address provider) external view returns (uint256)",
  "function getDefaultProvider() external view returns (address)"
];

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

  console.log(`🎯 Cerrando rifa en: ${RAFFLE_ADDRESS}`);
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
  const timeRemaining = await raffle.getTimeRemaining();
  const totalTickets = await raffle.totalTickets();
  const participantsCount = await raffle.getParticipantsCount();

  console.log("📊 Estado actual de la rifa:");
  console.log(`   Estado: ${state === 0n ? "Active" : state === 1n ? "EntropyRequested" : "DrawExecuted"}`);
  console.log(`   Tiempo restante: ${timeRemaining} segundos`);
  console.log(`   Total tickets vendidos: ${totalTickets.toString()} wei`);
  console.log(`   Total participantes: ${participantsCount.toString()}`);
  console.log("");

  // 4. Validaciones
  if (state !== 0n) {
    throw new Error(`❌ La rifa no está en estado Active (estado actual: ${state})`);
  }

  // Comentado para permitir cierre anticipado
  // if (timeRemaining > 0n) {
  //   throw new Error(`❌ La rifa aún está activa. Espera ${timeRemaining} segundos`);
  // }

  if (totalTickets === 0n) {
    throw new Error("❌ No hay tickets vendidos");
  }

  if (participantsCount === 0n) {
    throw new Error("❌ No hay participantes");
  }

  // 5. Obtener información de Entropy
  const entropyAddress = await raffle.entropy();
  const entropyProvider = await raffle.entropyProvider();
  
  console.log("🔮 Información de Pyth Entropy:");
  console.log(`   Entropy Contract: ${entropyAddress}`);
  console.log(`   Entropy Provider: ${entropyProvider}`);
  console.log("");

  // 6. Obtener el fee necesario
  const entropyContract = new Contract(
    entropyAddress,
    ENTROPY_ABI,
    provider
  );
  
  const fee = await entropyContract.getFee(entropyProvider);
  console.log(`💰 Fee de Pyth Entropy: ${fee.toString()} wei (${Number(fee) / 1e18} ETH)`);
  console.log("");

  // 7. Generar número aleatorio del usuario
  const userRandomNumber = hexlify(randomBytes(32));
  console.log(`🎲 Número aleatorio generado: ${userRandomNumber}`);
  console.log("");

  // 8. Solicitar entropía (cerrar la rifa)
  console.log("🚀 Enviando transacción para cerrar la rifa...");
  
  const tx = await raffle.requestEntropy(userRandomNumber, {
    value: fee,
  });
  
  console.log(`📝 Transacción enviada: ${tx.hash}`);
  console.log("⏳ Esperando confirmación...");
  
  const receipt = await tx.wait();
  console.log(`✅ Confirmada en el bloque ${receipt?.blockNumber}`);
  console.log("");

  // 9. Buscar el evento EntropyRequested
  const entropyRequestedEvent = receipt?.logs
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
    .find((event: any) => event?.name === "EntropyRequested");

  if (entropyRequestedEvent) {
    console.log("🎉 ¡Rifa cerrada exitosamente!");
    console.log(`   Sequence Number: ${entropyRequestedEvent.args.sequenceNumber}`);
    console.log("");
    console.log("⏳ Ahora espera a que Pyth Entropy responda automáticamente...");
    console.log("   Esto puede tomar algunos segundos o minutos.");
    console.log("");
    console.log("📋 Próximos pasos:");
    console.log("   1. Pyth llamará automáticamente a entropyCallback()");
    console.log("   2. Se seleccionará el ganador");
    console.log("   3. Luego deberás llamar a distributeFunds()");
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});

