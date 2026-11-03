import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    minimumCacheTTL: 0,
  },
};

export default nextConfig;
