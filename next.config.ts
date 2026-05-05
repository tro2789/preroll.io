import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {},
  webpack: (config) => {
    config.parallelism = 4;
    return config;
  },
};

export default nextConfig;
