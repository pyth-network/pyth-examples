import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pyth: {
          purple: "#7C3AED",
          dark: "#0F0A1F",
          card: "#1A1333",
          border: "#2D2252",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
