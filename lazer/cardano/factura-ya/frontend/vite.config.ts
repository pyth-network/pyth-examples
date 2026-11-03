import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/koios": {
        target: "https://preprod.koios.rest",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/koios/, ""),
      },
    },
  },
});
