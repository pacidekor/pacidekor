import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  AUTH_COOKIE_OPTIONS,
  getAuthCookieName,
  type AuthArea,
} from "@/lib/supabase/auth-area";
import type { Database } from "@/lib/supabase/database.types";

const browserClients: Partial<
  Record<AuthArea, ReturnType<typeof createBrowserClient<Database>>>
> = {};

export function createClient(area: AuthArea = "customer") {
  const cached = browserClients[area];
  if (cached) return cached;

  const { url, anonKey } = getSupabaseEnv();
  const client = createBrowserClient<Database>(url, anonKey, {
    isSingleton: false,
    cookieOptions: {
      name: getAuthCookieName(area, url),
      ...AUTH_COOKIE_OPTIONS,
    },
  });

  browserClients[area] = client;
  return client;
}

export function createCustomerClient() {
  return createClient("customer");
}

export function createAdminClient() {
  return createClient("admin");
}
