const path = require("path");
const fs = require("fs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Wallet dependencies use top-level await + async WASM.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    config.output.environment = {
      ...config.output.environment,
      asyncFunction: true,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Fix: libsodium-wrappers-sumo ESM build imports ./libsodium-sumo.mjs
    // which lives in the separate libsodium-sumo package.
    const wantedKey = path.resolve(
      __dirname,
      "node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs"
    );
    const actualFile = path.resolve(
      __dirname,
      "node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs"
    );
    config.resolve.alias = {
      ...config.resolve.alias,
      [wantedKey]: actualFile,
    };

    // Fix: copy sidan-csl-rs WASM to the server output folder so Next.js SSR
    // can find it (even though the components are client-only, Next.js still
    // walks the import graph at build time).
    if (isServer) {
      const wasmSrc = path.resolve(
        __dirname,
        "node_modules/@sidan-lab/sidan-csl-rs-browser/sidan_csl_rs_bg.wasm"
      );
      const wasmDest = path.resolve(
        __dirname,
        ".next/server/app/sidan_csl_rs_bg.wasm"
      );
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tap("CopyWasm", () => {
            const destDir = path.dirname(wasmDest);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            if (!fs.existsSync(wasmDest)) fs.copyFileSync(wasmSrc, wasmDest);
            // Also copy to server/chunks/
            const chunksWasm = path.resolve(
              __dirname,
              ".next/server/chunks/sidan_csl_rs_bg.wasm"
            );
            const chunksDir = path.dirname(chunksWasm);
            if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });
            if (!fs.existsSync(chunksWasm)) fs.copyFileSync(wasmSrc, chunksWasm);
          });
        },
      });
    }

    return config;
  },
};

module.exports = nextConfig;
