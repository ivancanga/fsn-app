import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Modo estricto para identificar problemas
  allowedDevOrigins: ["192.168.1.24"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
