import { getRuntimeEnv } from "@/lib/runtime-env";

export function getSupabaseEnv() {
  // MUST read process.env.NEXT_PUBLIC_* directly first so Next.js inlines them
  // into the client bundle. Dynamic-only access breaks the client.
  //
  // On Cloudflare, if Build variables were missing, the inlined values are
  // undefined — fall back to Worker runtime Variables via getCloudflareContext
  // so SSR can still succeed (client still needs a rebuild with Build vars).
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    url = url || getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL");
    anonKey = anonKey || getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!url || !anonKey) {
    throw new Error(
      "Chýba NEXT_PUBLIC_SUPABASE_URL alebo NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local / Vercel / CF Build+Runtime Variables).",
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
