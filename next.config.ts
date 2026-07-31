import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product photo uploads (raw JPG/PNG) before WebP compression on the server
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["sharp"],
  images: {
    formats: ["image/webp"],
    qualities: [75, 90],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 320, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
