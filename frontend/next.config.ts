import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false; // disable cache, save memory
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};
export default nextConfig;
