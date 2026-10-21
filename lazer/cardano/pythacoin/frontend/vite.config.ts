import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6001,
    proxy: {
      "/api": {
        target: "http://localhost:8088",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
