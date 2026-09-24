import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 5177,
    proxy: {
      "/koios": {
        target: "https://preprod.koios.rest",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/koios/, ""),
      },
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "process"],
    }),
  ],
  resolve: {
    alias: {
      "@plutus": resolve(__dirname, "../plutus.json"),
    },
  },
});
