import { LazerClient } from "@pythnetwork/pyth-lazer-cardano-js";
import 'dotenv/config';

async function test() {
  console.log("🚀 Iniciando prueba de fuego LemonPyth...");
  try {
    const client = new LazerClient({
      token: process.env.VITE_PYTH_API_KEY || "F03Bq9mHJBobUHqLbwY5mXceMSxqYVpWEeE-cardano",
      endpoint: "wss://lazer.pyth.network/ws"
    });
    console.log("✅ Conexión con Lazer exitosa.");
  } catch (e) {
    console.error("❌ Falló la conexión:", e.message);
  }
}
test();