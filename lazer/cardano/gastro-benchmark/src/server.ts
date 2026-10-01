import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { URL } from "url";
import { BenchmarkService } from "./benchmark-service";
import { shutdownPythClient } from "./pyth";
import type { NormalizedSupplierOfferInput } from "./types";

const service = new BenchmarkService();

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload, null, 2));
}

function notFound(response: ServerResponse) {
  sendJson(response, 404, { error: "Not found" });
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return (raw ? JSON.parse(raw) : {}) as T;
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const method = request.method ?? "GET";
  const parsedUrl = new URL(request.url ?? "/", "http://localhost");

  try {
    if (method === "GET" && parsedUrl.pathname === "/health") {
      return sendJson(response, 200, await service.getHealth());
    }

    if (method === "GET" && parsedUrl.pathname === "/feeds") {
      return sendJson(response, 200, await service.listFeeds());
    }

    if (method === "GET" && parsedUrl.pathname === "/benchmarks/latest") {
      return sendJson(response, 200, await service.getLatestBenchmarks());
    }

    if (method === "GET" && parsedUrl.pathname === "/benchmarks/history") {
      const benchmarkId = Number(parsedUrl.searchParams.get("benchmarkId"));
      const points = Number(parsedUrl.searchParams.get("points") ?? "24");
      if (!Number.isFinite(benchmarkId)) {
        return sendJson(response, 400, { error: "benchmarkId query param is required" });
      }
      return sendJson(response, 200, await service.getBenchmarkHistory(benchmarkId, points));
    }

    if (method === "POST" && parsedUrl.pathname === "/compare/products") {
      const body = await readJsonBody<{ items?: NormalizedSupplierOfferInput[] }>(request);
      return sendJson(response, 200, {
        results: await service.compareOffers(body.items ?? []),
      });
    }

    if (method === "POST" && parsedUrl.pathname === "/compare/offers") {
      const body = await readJsonBody<{ items?: NormalizedSupplierOfferInput[] }>(request);
      return sendJson(response, 200, {
        results: await service.compareOffers(body.items ?? []),
      });
    }

    return notFound(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return sendJson(response, 500, { error: message });
  }
}

export function startServer(port = Number(process.env.PORT ?? "8080")) {
  const server = createServer((request, response) => {
    void handleRequest(request, response);
  });

  server.listen(port, () => {
    console.log(`gastro-benchmark listening on http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
    await shutdownPythClient();
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  return server;
}

if (require.main === module) {
  startServer();
}
