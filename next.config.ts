import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid picking C:\Users\tomas\package-lock.json as Turbopack root
  turbopack: {
    root: process.cwd(),
  },
  // Product photo uploads (raw JPG/PNG) before WebP compression on the server
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["sharp"],
  images: {
    // Hobby plan: Vercel Image Optimization returns 402 after quota.
    // Photos are already WebP in Supabase — serve them directly.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "skytsyfjowwyzpvhidco.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
