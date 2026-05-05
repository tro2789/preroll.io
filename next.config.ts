import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.parallelism = 4;
    return config;
  },
};

export default nextConfig;
