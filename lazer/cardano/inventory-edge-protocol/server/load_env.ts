/**
 * Carga `.env` desde la raíz del repo (padre de `server/`), no desde `process.cwd()`.
 * Así `tsx server/index.ts` o `npm run dev:api` ven las variables aunque el cwd varíe.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverDir, "..");
dotenv.config({ path: path.join(repoRoot, ".env") });

/** Sin esto, con stdout en pipe (`concurrently`, logs), EPIPE puede tumbar el proceso tras `listen`. */
for (const stream of [process.stdout, process.stderr]) {
  stream.on("error", (e: NodeJS.ErrnoException) => {
    if (e.code === "EPIPE" || e.code === "ERR_STREAM_DESTROYED") return;
  });
}
try {
  process.stdin.resume();
} catch {
  /* sin stdin */
}
