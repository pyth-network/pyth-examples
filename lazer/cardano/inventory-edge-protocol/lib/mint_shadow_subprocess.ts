/**
 * Mint shadow NFT en un subproceso: instancia WASM de Lucid/CML limpia, sin compartir
 * estado con Express ni con otras rutas que usen Lucid en el mismo proceso.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DemoSlot } from "./feeds.js";
import type { MintShadowResult } from "./mint_shadow.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const childScript = path.join(repoRoot, "scripts", "mint_shadow_child.ts");

export function mintShadowNftSubprocess(slot: DemoSlot): Promise<MintShadowResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", childScript, slot],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c: string) => {
      stdout += c;
    });
    child.stderr.on("data", (c: string) => {
      stderr += c;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `mint subprocess failed (code ${code}, signal ${signal ?? "none"})`,
          ),
        );
        return;
      }
      const lines = stdout.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last) {
        reject(new Error("mint subprocess: empty stdout"));
        return;
      }
      try {
        resolve(JSON.parse(last) as MintShadowResult);
      } catch {
        reject(
          new Error(
            `mint subprocess: invalid JSON: ${last.slice(0, 400)}`,
          ),
        );
      }
    });
  });
}
