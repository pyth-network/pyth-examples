/**
 * PythGuard Keeper Bot — monitor.ts
 * ============================================================
 * Monitorea el precio ADA/USD via Pyth Lazer en tiempo real.
 * Cuando el precio cae por debajo del umbral de stop-loss,
 * genera el PriceUpdateProof para el contrato Cardano.
 * ============================================================
 */

import * as dotenv from "dotenv";
import WebSocket from "ws";
import path from "path";

// Cargar variables de entorno desde ../.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PYTH_API_KEY = process.env.PYTH_API_KEY!;
const PYTH_PREPROD_POLICY_ID = process.env.PYTH_PREPROD_POLICY_ID!;
const NETWORK = process.env.NETWORK ?? "Cardano PreProd";
const STOP_LOSS_THRESHOLD = parseFloat(process.env.STOP_LOSS_THRESHOLD ?? "0.35");

// Feed ID de ADA/USD en Pyth Price Feeds
// https://pyth.network/developers/price-feed-ids
const ADA_USD_FEED_ID =
  process.env.ADA_USD_FEED_ID ??
  "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f";

// URL del endpoint WebSocket de Pyth Lazer
const PYTH_LAZER_WS =
  process.env.PYTH_LAZER_WS_URL ?? "wss://api.pyth.network/ws";

// Intervalo de actualización de Pyth Lazer: 400ms
const UPDATE_INTERVAL_MS = 400;

// ============================================================
// TIPOS
// ============================================================

interface PythLazerPriceUpdate {
  type: string;
  price_feeds: Array<{
    id: string;
    price: {
      price: string;
      conf: string;
      expo: number;
      publish_time: number;
    };
    ema_price?: {
      price: string;
      expo: number;
    };
  }>;
  slot?: number;
}

interface PriceUpdateProof {
  price: number;
  rawPrice: bigint;
  publishTime: number;
  feedId: string;
  pythSignature: string;
  targetPriceOnChain: bigint;
  network: string;
  triggeredAt: string;
}

// ============================================================
// ESTADO GLOBAL
// ============================================================

let lastPrice: number | null = null;
let stopLossTriggered = false;
let updateCount = 0;

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function formatPrice(price: number): string {
  return `$${price.toFixed(6)}`;
}

function normalizePrice(rawPrice: string, expo: number): number {
  return parseFloat(rawPrice) * Math.pow(10, expo);
}

/**
 * Genera el PriceUpdateProof compatible con el contrato Aiken.
 * En producción, esto se enviaría como redeemer a la transacción Cardano.
 */
function buildPriceUpdateProof(
  price: number,
  publishTime: number,
  rawPrice: string,
  expo: number
): PriceUpdateProof {
  // Convertir precio a micro-USD (6 decimales) para el contrato
  const priceInMicroUSD = BigInt(Math.round(price * 1_000_000));
  // Target price en micro-USD
  const targetInMicroUSD = BigInt(Math.round(STOP_LOSS_THRESHOLD * 1_000_000));

  return {
    price,
    rawPrice: BigInt(rawPrice),
    publishTime,
    feedId: ADA_USD_FEED_ID,
    pythSignature: PYTH_PREPROD_POLICY_ID, // En producción: firma real del oráculo
    targetPriceOnChain: targetInMicroUSD,
    network: NETWORK,
    triggeredAt: new Date().toISOString(),
  };
}

/**
 * Simula la preparación de la transacción Cardano con el proof.
 * En producción: construiría y enviaria la TX via lucid-evolution o cardano-js-sdk.
 */
async function prepareStopLossTransaction(proof: PriceUpdateProof): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("🔴 STOP-LOSS ACTIVADO — TRANSACCIÓN PREPARADA");
  console.log("=".repeat(60));
  console.log("📋 PriceUpdateProof:");
  console.log(JSON.stringify(proof, (_, v) =>
    typeof v === "bigint" ? v.toString() : v, 2));
  console.log("\n📡 Red:", proof.network);
  console.log("🔑 Pyth Policy ID:", proof.pythSignature);
  console.log("💰 Precio ADA/USD:", formatPrice(proof.price));
  console.log("🎯 Umbral Stop-Loss:", formatPrice(STOP_LOSS_THRESHOLD));
  console.log("⏰ Publicado en:", new Date(proof.publishTime * 1000).toISOString());
  console.log("\n✅ Redeemer listo para enviar al contrato pyth_guard.ak");
  console.log("   → target_price:", proof.targetPriceOnChain.toString(), "micro-USD");
  console.log("   → pyth_signature:", proof.pythSignature);
  console.log("=".repeat(60) + "\n");
}

// ============================================================
// LÓGICA PRINCIPAL DEL KEEPER
// ============================================================

function processUpdate(update: PythLazerPriceUpdate): void {
  const feed = update.price_feeds?.find(
    (f) => f.id.toLowerCase() === ADA_USD_FEED_ID.toLowerCase()
  );

  if (!feed) return;

  const price = normalizePrice(feed.price.price, feed.price.expo);
  const publishTime = feed.price.publish_time;
  updateCount++;

  lastPrice = price;

  // Log compacto cada 5 actualizaciones para no saturar stdout
  if (updateCount % 5 === 0) {
    const status = price <= STOP_LOSS_THRESHOLD ? "🔴 STOP-LOSS" : "🟢 Protegido";
    process.stdout.write(
      `\r[${new Date().toISOString()}] ADA/USD: ${formatPrice(price)} | Umbral: ${formatPrice(STOP_LOSS_THRESHOLD)} | ${status} | Updates: ${updateCount}   `
    );
  }

  // Verificar si se activa el stop-loss
  if (price <= STOP_LOSS_THRESHOLD && !stopLossTriggered) {
    stopLossTriggered = true;
    const proof = buildPriceUpdateProof(
      price,
      publishTime,
      feed.price.price,
      feed.price.expo
    );
    // Fire-and-forget: prepara la transacción
    prepareStopLossTransaction(proof).catch(console.error);
  } else if (price > STOP_LOSS_THRESHOLD && stopLossTriggered) {
    // Resetear si el precio se recupera (trailing stop)
    stopLossTriggered = false;
    console.log(`\n🟢 Precio recuperado: ${formatPrice(price)} — Stop-Loss desactivado.`);
  }
}

// ============================================================
// CONEXIÓN WEBSOCKET A PYTH LAZER
// ============================================================

function connectToPythLazer(): void {
  console.log("🚀 PythGuard Keeper Bot iniciando...");
  console.log(`📡 Red: ${NETWORK}`);
  console.log(`🎯 Par: ADA/USD`);
  console.log(`⚡ Intervalo Pyth Lazer: ${UPDATE_INTERVAL_MS}ms`);
  console.log(`🛡️  Umbral Stop-Loss: ${formatPrice(STOP_LOSS_THRESHOLD)}`);
  console.log(`🔑 Pyth Policy ID: ${PYTH_PREPROD_POLICY_ID}`);
  console.log("\nConectando a Pyth Lazer...\n");

  const ws = new WebSocket(PYTH_LAZER_WS, {
    headers: {
      Authorization: `Bearer ${PYTH_API_KEY}`,
    },
  });

  ws.on("open", () => {
    console.log("✅ Conectado a Pyth Lazer WebSocket\n");

    // Suscribirse al feed ADA/USD
    const subscribeMsg = {
      type: "subscribe",
      ids: [ADA_USD_FEED_ID],
      properties: ["price"],
      chains: ["EVM"], // Pyth Lazer también expone datos para Cardano via este endpoint
      delivery: {
        best_effort: {
          update_buffer_ms: UPDATE_INTERVAL_MS,
        },
      },
    };

    ws.send(JSON.stringify(subscribeMsg));
    console.log("📩 Suscripción enviada al feed ADA/USD");
    console.log("⏳ Esperando actualizaciones de precio...\n");
  });

  ws.on("message", (data: WebSocket.RawData) => {
    try {
      const update: PythLazerPriceUpdate = JSON.parse(data.toString());
      if (update.type === "price_update" || update.price_feeds) {
        processUpdate(update);
      }
    } catch {
      // Ignorar mensajes no-JSON (pueden ser pings del servidor)
    }
  });

  ws.on("error", (err: Error) => {
    console.error("\n❌ Error de WebSocket:", err.message);
    console.log("🔄 Reconectando en 3 segundos...");
    setTimeout(connectToPythLazer, 3000);
  });

  ws.on("close", (code: number, reason: Buffer) => {
    console.log(
      `\n⚠️  Conexión cerrada [${code}]: ${reason.toString() || "Sin motivo"}`
    );
    if (code !== 1000) {
      console.log("🔄 Reconectando en 3 segundos...");
      setTimeout(connectToPythLazer, 3000);
    }
  });

  // Heartbeat cada 30 segundos para mantener la conexión activa
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(heartbeat);
    }
  }, 30_000);
}

// ============================================================
// ENTRYPOINT
// ============================================================

// Validar que las variables críticas estén configuradas
if (!PYTH_API_KEY) {
  console.error("❌ Error: PYTH_API_KEY no está configurada en el .env");
  process.exit(1);
}

if (!PYTH_PREPROD_POLICY_ID) {
  console.error("❌ Error: PYTH_PREPROD_POLICY_ID no está configurada en el .env");
  process.exit(1);
}

// Iniciar el keeper
connectToPythLazer();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 PythGuard Keeper Bot detenido.");
  console.log(`📊 Total de actualizaciones procesadas: ${updateCount}`);
  console.log(`💰 Último precio ADA/USD: ${lastPrice ? formatPrice(lastPrice) : "N/A"}`);
  process.exit(0);
});
