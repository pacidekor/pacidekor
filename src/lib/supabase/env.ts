import { getRuntimeEnv } from "@/lib/runtime-env";

export function getSupabaseEnv() {
  // MUST be direct process.env.NEXT_PUBLIC_* so Next.js inlines them into the client bundle.
  // Dynamic process.env[name] breaks Vercel + CF client and crashes the app.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Chýba NEXT_PUBLIC_SUPABASE_URL alebo NEXT_PUBLIC_SUPABASE_ANON_KEY v .env.local / Vercel env.",
    );
  }

  return { url, anonKey };
}

export function getSupabaseServiceRoleKey() {
  const serviceKey = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    throw new Error(
      "Chýba SUPABASE_SERVICE_ROLE_KEY (Vercel/CF Worker Variables).",
    );
  }
  return serviceKey;
}
