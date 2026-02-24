import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure environment variables are loaded
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'erp-nextgen-secret-key-2024-fallback-min-32-chars',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
