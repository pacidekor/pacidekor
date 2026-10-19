import { getRuntimeEnv } from "@/lib/runtime-env";

export function getSupabaseEnv() {
  const url = getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error(
      "Chýba NEXT_PUBLIC_SUPABASE_URL alebo NEXT_PUBLIC_SUPABASE_ANON_KEY (CF Worker Variables / .env.local).",
    );
  }

  return { url, anonKey };
}

export function getSupabaseServiceRoleKey() {
  const serviceKey = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    throw new Error(
      "Chýba SUPABASE_SERVICE_ROLE_KEY (CF Worker Settings → Variables and Secrets).",
    );
  }
  return serviceKey;
}
