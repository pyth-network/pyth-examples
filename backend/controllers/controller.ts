import { Request, Response } from "express";
import { MeshWallet, BlockfrostProvider } from "@meshsdk/core";
import dotenv from "dotenv";
dotenv.config();



const PYTH_URLS = [
  process.env.BASE_URL1,
  process.env.BASE_URL2,
  process.env.BASE_URL3,
].filter(Boolean) as string[];

const pythRequestBody = {
  symbols: ["Crypto.ADA/USD"],
  properties: ["price", "confidence", "exponent", "publisherCount"],
  formats: ["solana"],
  channel: "fixed_rate@200ms",
  parsed: true,
  jsonBinaryEncoding: "hex",
};

async function fetchWithFallback(path: string, body: object): Promise<any> {
  let lastError: Error | null = null;

  for (const baseUrl of PYTH_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PYTH_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();

    } catch (error: any) {
      console.warn(`⚠️  Falló ${baseUrl}: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error(`Todos los endpoints fallaron. Último error: ${lastError?.message}`);
}

export const getADAPriceFromPyth = async (req: Request, res: Response) => {
  try {
    const data = await fetchWithFallback("/latest_price", pythRequestBody);

    const feed = data.parsed.priceFeeds[0];
    const price = Number(feed.price) * Math.pow(10, feed.exponent);
    const confidence = Number(feed.confidence) * Math.pow(10, feed.exponent);
    const timestamp = new Date(Number(data.parsed.timestampUs) / 1000).toISOString();

    res.json({
      symbol: "ADA/USD",
      price,
      confidence,
      publishers: feed.publisherCount,
      timestamp,
      solanaPayload: data.solana?.data ?? null,
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


export const getADAPriceRangeFromPyth = async (req: Request, res: Response) => {
  try {
    const { from, to, interval } = req.query;

    if (!from || !to) {
      res.status(400).json({ error: "Se requieren 'from' y 'to' (Unix en segundos)" });
      return;
    }

    const fromSec = Number(from);
    const toSec = Number(to);

    // Intervalo en segundos, por defecto 1 minuto
    const intervalSec = Number(interval ?? 60);

    // Generar array de timestamps entre from y to
    const timestamps: number[] = [];
    for (let t = fromSec; t <= toSec; t += intervalSec) {
      timestamps.push(t);
    }

    // Límite de seguridad para no saturar la API
    if (timestamps.length > 500) {
      res.status(400).json({
        error: `Demasiados puntos (${timestamps.length}). Reduce el rango o aumenta el intervalo.`,
        suggestion: `Máximo recomendado: 500 puntos. Con interval=${Math.ceil((toSec - fromSec) / 500)}s entraría justo.`
      });
      return;
    }

    // Llamadas en paralelo con límite de concurrencia (evitar rate limit 429)
    const CONCURRENCY = 10;
    const results: any[] = [];

    for (let i = 0; i < timestamps.length; i += CONCURRENCY) {
      const batch = timestamps.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.allSettled(
        batch.map((ts) =>
          fetchWithFallback("/price", {
            symbols: ["Crypto.ADA/USD"],
            properties: ["price", "confidence", "exponent"],
            formats: ["solana"],
            channel: "fixed_rate@200ms",
            parsed: true,
            jsonBinaryEncoding: "hex",
            timestamp: ts * 1_000_000, // → microsegundos
          })
        )
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          const feed = result.value.parsed.priceFeeds[0];
          const price = Number(feed.price) * Math.pow(10, feed.exponent);
          const confidence = Number(feed.confidence) * Math.pow(10, feed.exponent);
          const time = Math.floor(Number(result.value.parsed.timestampUs) / 1_000_000);

          results.push({
            time,        // Unix segundos — formato que espera TradingView
            value: price,
            confidence,
          });
        }
        // Si falla un punto simplemente se omite, no rompe todo
      }
    }

    // Ordenar por tiempo ascendente
    results.sort((a, b) => a.time - b.time);

    res.json({
      symbol: "ADA/USD",
      from: new Date(fromSec * 1000).toISOString(),
      to: new Date(toSec * 1000).toISOString(),
      intervalSec,
      points: results.length,
      data: results,
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


export const getADAPriceHistoryFromPyth = async (req: Request, res: Response) => {
  try {
    const { timestamp } = req.query;

    if (!timestamp) {
      res.status(400).json({ error: "Se requiere el parámetro 'timestamp' (Unix en segundos)" });
      return;
    }

    // Convertir segundos → microsegundos que requiere Pyth
    const timestampUs = Number(timestamp) * 1_000_000;

    const data = await fetchWithFallback("/price", {
      symbols: ["Crypto.ADA/USD"],
      properties: ["price", "confidence", "exponent", "publisherCount"],
      formats: ["solana"],
      channel: "fixed_rate@200ms",
      parsed: true,
      jsonBinaryEncoding: "hex",
      timestamp: timestampUs,
    });

    const feed = data.parsed.priceFeeds[0];
    const price = Number(feed.price) * Math.pow(10, feed.exponent);
    const confidence = Number(feed.confidence) * Math.pow(10, feed.exponent);
    const timestamp_iso = new Date(Number(data.parsed.timestampUs) / 1000).toISOString();

    res.json({
      symbol: "ADA/USD",
      price,
      confidence,
      publishers: feed.publisherCount,
      timestamp_requested: new Date(Number(timestamp) * 1000).toISOString(),
      timestamp_actual: timestamp_iso,
      solanaPayload: data.solana?.data ?? null,
    });

  } catch (error: any) {
    // Pyth retorna 404 si no hay datos para ese timestamp
    if (error.message.includes("404")) {
      res.status(404).json({ error: "No se encontraron datos para ese timestamp" });
      return;
    }
    res.status(500).json({ error: error.message });
  }
};