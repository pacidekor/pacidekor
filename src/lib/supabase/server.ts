import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  getSupabaseEnv,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/env";
import {
  AUTH_COOKIE_OPTIONS,
  getAuthCookieName,
  type AuthArea,
} from "@/lib/supabase/auth-area";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient(area: AuthArea = "customer") {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookieOptions: {
      name: getAuthCookieName(area, url),
      ...AUTH_COOKIE_OPTIONS,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}

export async function createCustomerClient() {
  return createClient("customer");
}

export async function createAdminClient() {
  return createClient("admin");
}

/** Cookie-less anon client for public reads (e.g. generateStaticParams / catalog). */
export function createPublicClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Service-role client for privileged admin ops (e.g. delete Auth user). */
export function createServiceClient() {
  const { url } = getSupabaseEnv();
  const serviceKey = getSupabaseServiceRoleKey();

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
