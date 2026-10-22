import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid picking C:\Users\tomas\package-lock.json as Turbopack root
  turbopack: {
    root: process.cwd(),
  },
  // Product photo uploads (raw JPG/PNG) before WebP compression on the server
  experimental: {
    serverActions: {
      // Vercel Functions hard-cap request bodies at 4.5 MB; admin uploads bypass
      // Server Actions and go straight to Supabase Storage from the browser.
      bodySizeLimit: "4mb",
      allowedOrigins: [
        "pacidekor.sk",
        "www.pacidekor.sk",
        "pacidekor.tomas-8a7.workers.dev",
      ],
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
      // R2 public / custom domain (after Enable R2 + sync)
      {
        protocol: "https",
        hostname: "media.pacidekor.sk",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

// Cloudflare local bindings only — never touch Vercel runtime/build
if (!process.env.VERCEL) {
  import("@opennextjs/cloudflare")
    .then(({ initOpenNextCloudflareForDev }) => {
      initOpenNextCloudflareForDev();
    })
    .catch(() => {
      // Optional during local non-CF work
    });
}

