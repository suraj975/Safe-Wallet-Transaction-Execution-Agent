import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    CONSOLE_KIT_API_KEY: process.env.CONSOLE_KIT_API_KEY,
    CONSOLE_KIT_BASE_URL: process.env.CONSOLE_KIT_BASE_URL,
  },
};

export default nextConfig;
