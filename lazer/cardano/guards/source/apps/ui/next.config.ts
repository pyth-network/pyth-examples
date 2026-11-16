import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
