import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["deployment/__tests__/**/*.test.ts"],
    setupFiles: ["deployment/__tests__/setup.ts"],
  },
});
