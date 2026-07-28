"use client";

import { createClient } from "@/lib/supabase/client";
import { logout as logoutAction } from "@/lib/actions/auth";

export async function isAdminAuthenticated(): Promise<boolean> {
  const supabase = createClient();
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
  await logoutAction();
}
