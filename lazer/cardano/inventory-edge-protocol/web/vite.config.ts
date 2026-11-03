import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: dir,
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (_err, _req, res) => {
            const r = res as {
              writeHead?: (c: number, h: Record<string, string>) => void;
              end?: (b: string) => void;
              headersSent?: boolean;
            };
            if (typeof r.writeHead === "function" && !r.headersSent) {
              r.writeHead(502, { "Content-Type": "application/json" });
              r.end(
                JSON.stringify({
                  error:
                    "No hay API en :8787. Desde la carpeta del proyecto: npm run dev (recomendado), npm run demo, o en otra terminal npm run dev:api.",
                  code: "API_UNAVAILABLE",
                }),
              );
            }
          });
        },
      },
    },
  },
});
