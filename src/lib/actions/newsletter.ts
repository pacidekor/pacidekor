"use server";

import type { ActionResult } from "@/lib/customers";
import { emailError } from "@/lib/form-validation";
import {
  sendNewsletterCampaign,
  subscribeNewsletter,
  unsubscribeNewsletter,
} from "@/lib/newsletter";
import { createAdminClient } from "@/lib/supabase/server";

export async function subscribeNewsletterAction(input: {
  email: string;
  name?: string;
}): Promise<ActionResult> {
  const check = emailError(input.email);
  if (check) return { ok: false, error: check };
  return subscribeNewsletter(input);
}

export async function unsubscribeNewsletterAction(input: {
  email: string;
  token: string;
}): Promise<ActionResult> {
  return unsubscribeNewsletter(input);
}

async function requireAdmin() {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Nie ste prihlásený." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Nemáte oprávnenie administrátora." };
  }
  return { ok: true as const };
}

/** Admin: manuálne spustiť odoslanie newslettera všetkým odberateľom. */
export async function sendNewsletterCampaignAction(): Promise<
  ActionResult<{
    attempted: number;
    sent: number;
    failed: number;
    skipped: boolean;
    reason?: string;
  }>
> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  try {
    const summary = await sendNewsletterCampaign();
    return { ok: true, data: summary };
  } catch (error) {
    console.error("sendNewsletterCampaignAction:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Odoslanie newslettera zlyhalo.",
    };
  }
}
