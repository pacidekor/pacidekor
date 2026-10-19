import { NextResponse } from "next/server";
import { ensureCloudflareEnv, getRuntimeEnvAsync } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Non-secret diagnostics: which env keys the Worker can see at runtime.
 * Safe to leave in prod (booleans only).
 */
export async function GET() {
  await ensureCloudflareEnv();

  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "CRON_SECRET",
  ] as const;

  const present: Record<string, boolean> = {};
  for (const key of keys) {
    const fromProcess = Boolean(process.env[key]?.trim());
    const fromAsync = Boolean(await getRuntimeEnvAsync(key));
    present[key] = fromProcess || fromAsync;
  }

  return NextResponse.json({
    platform: process.env.VERCEL
      ? "vercel"
      : process.env.CF_PAGES || process.env.WORKERS_CI
        ? "cloudflare-ci"
        : "cloudflare-or-local",
    hasVercel: Boolean(process.env.VERCEL),
    present,
  });
}
