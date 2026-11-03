/**
 * libsodium-wrappers-sumo ESM entry imports "./libsodium-sumo.mjs" from the same
 * directory as libsodium-wrappers.mjs, but the published package only ships the
 * wrapper file; the real module lives in libsodium-sumo. Bare Node + pnpm hit
 * ERR_MODULE_NOT_FOUND without this symlink.
 *
 * The wrappers package may only appear under .pnpm (not hoisted to root
 * node_modules), so we locate it explicitly.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findWrappersPkgRoot() {
  const direct = path.join(serverRoot, "node_modules", "libsodium-wrappers-sumo");
  if (fs.existsSync(path.join(direct, "package.json"))) {
    return fs.realpathSync(direct);
  }

  const pnpmDir = path.join(serverRoot, "node_modules", ".pnpm");
  if (!fs.existsSync(pnpmDir)) {
    return null;
  }
  for (const name of fs.readdirSync(pnpmDir, { withFileTypes: true })) {
    if (!name.isDirectory() || !name.name.startsWith("libsodium-wrappers-sumo@")) {
      continue;
    }
    const candidate = path.join(pnpmDir, name.name, "node_modules", "libsodium-wrappers-sumo");
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return fs.realpathSync(candidate);
    }
  }
  return null;
}

function main() {
  const wsPkgRoot = findWrappersPkgRoot();
  if (!wsPkgRoot) {
    console.warn("[patch-libsodium-esm] libsodium-wrappers-sumo not found, skip");
    return;
  }

  const sumoPkgRoot = path.join(wsPkgRoot, "..", "libsodium-sumo");

  const esmDir = path.join(wsPkgRoot, "dist", "modules-sumo-esm");
  const linkPath = path.join(esmDir, "libsodium-sumo.mjs");
  const targetPath = path.join(sumoPkgRoot, "dist", "modules-sumo-esm", "libsodium-sumo.mjs");

  if (!fs.existsSync(path.join(sumoPkgRoot, "package.json"))) {
    console.warn("[patch-libsodium-esm] sibling libsodium-sumo not found:", sumoPkgRoot);
    return;
  }
  if (!fs.existsSync(targetPath)) {
    console.warn("[patch-libsodium-esm] missing target:", targetPath);
    return;
  }
  if (!fs.existsSync(esmDir)) {
    console.warn("[patch-libsodium-esm] missing dir:", esmDir);
    return;
  }

  const relTarget = path.relative(esmDir, targetPath);

  try {
    if (fs.existsSync(linkPath)) {
      const st = fs.lstatSync(linkPath);
      if (st.isSymbolicLink()) {
        const resolved = path.resolve(esmDir, fs.readlinkSync(linkPath));
        if (resolved === path.resolve(targetPath)) {
          return;
        }
      }
      fs.unlinkSync(linkPath);
    }
    fs.symlinkSync(relTarget, linkPath);
    console.log("[patch-libsodium-esm] OK", linkPath, "->", relTarget);
  } catch (e) {
    console.error("[patch-libsodium-esm]", e);
    process.exitCode = 1;
  }
}

main();
