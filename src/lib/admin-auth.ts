"use client";

import { createAdminClient } from "@/lib/supabase/client";
import { logoutAdmin } from "@/lib/actions/auth";

export async function isAdminAuthenticated(): Promise<boolean> {
  const supabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

export async function clearAdminSession(): Promise<void> {
  await logoutAdmin();
}
