"use server";

import { revalidatePath } from "next/cache";
import {
  loginBlockedMessage,
  normalizeEmail,
  profileToCustomer,
  type ActionResult,
  type Customer,
  type CustomerStatus,
  type CustomerType,
  type RetailRegistrationInput,
  type WholesaleRegistrationInput,
} from "@/lib/customers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ProfileRow, ProfileUpdate } from "@/lib/supabase/database.types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Nie ste prihlásený.", supabase, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      ok: false as const,
      error: "Nemáte oprávnenie administrátora.",
      supabase,
      user,
    };
  }

  return { ok: true as const, supabase, user };
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "Účet s týmto e-mailom už existuje.";
  }
  if (lower.includes("password")) {
    return "Heslo spĺňa požiadavky? Skúste silnejšie heslo (min. 6 znakov).";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Nesprávny e-mail alebo heslo.";
  }
  if (lower.includes("email")) {
    return "Neplatný e-mail alebo účet s týmto e-mailom už existuje.";
  }
  return message || "Nepodarilo sa dokončiť požiadavku.";
}

export async function registerWholesale(
  input: WholesaleRegistrationInput,
): Promise<ActionResult<{ customerId: string }>> {
  const email = normalizeEmail(input.email);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        type: "velkoobchod",
        status: "ziada_registraciu",
        name: input.name.trim(),
        phone: input.phone.trim(),
        company: input.company.trim(),
        ico: input.ico.trim(),
        dic: input.dic?.trim() || "",
        street: input.street.trim(),
        city: input.city.trim(),
        zip: input.zip.trim(),
        country: input.country.trim() || "Slovensko",
        note: input.note?.trim() || "",
      },
    },
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  if (!data.user) {
    return { ok: false, error: "Registrácia zlyhala. Skúste to znova." };
  }

  // Wholesale must wait for approval — do not keep a session.
  await supabase.auth.signOut();

  return { ok: true, data: { customerId: data.user.id } };
}

export async function registerRetail(
  input: RetailRegistrationInput,
): Promise<ActionResult<{ customer: Customer }>> {
  const email = normalizeEmail(input.email);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        type: "maloobchod",
        status: "aktivny",
        name: input.name.trim(),
        phone: input.phone.trim(),
        street: input.street.trim(),
        city: input.city.trim(),
        zip: input.zip.trim(),
        country: input.country.trim() || "Slovensko",
      },
    },
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  if (!data.user) {
    return { ok: false, error: "Registrácia zlyhala. Skúste to znova." };
  }

  // Trigger may lag a moment — fetch profile (retry once).
  let profile: ProfileRow | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();
    if (row) {
      profile = row;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  if (!profile) {
    return {
      ok: false,
      error: "Účet vznikol, ale profil sa nenačítal. Skúste sa prihlásiť.",
    };
  }

  return { ok: true, data: { customer: profileToCustomer(profile) } };
}

async function loginWithTypeCheck(
  emailRaw: string,
  password: string,
  expectedType: CustomerType,
): Promise<ActionResult<{ customer: Customer }>> {
  const email = normalizeEmail(emailRaw);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Nesprávny e-mail alebo heslo." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { ok: false, error: "Profil sa nenašiel. Kontaktujte podporu." };
  }

  if (profile.role === "admin") {
    // Admins use /admin/login
    await supabase.auth.signOut();
    return { ok: false, error: "Nesprávny e-mail alebo heslo." };
  }

  if (profile.type !== expectedType) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error:
        expectedType === "velkoobchod"
          ? "Tento účet nie je veľkoobchodný. Použite maloobchodné prihlásenie."
          : "Tento účet nie je maloobchodný. Použite veľkoobchodné prihlásenie.",
    };
  }

  const blocked = loginBlockedMessage(profile.status, profile.type);
  if (blocked) {
    await supabase.auth.signOut();
    return { ok: false, error: blocked };
  }

  return { ok: true, data: { customer: profileToCustomer(profile) } };
}

export async function loginWholesale(
  email: string,
  password: string,
): Promise<ActionResult<{ customer: Customer }>> {
  return loginWithTypeCheck(email, password, "velkoobchod");
}

export async function loginRetail(
  email: string,
  password: string,
): Promise<ActionResult<{ customer: Customer }>> {
  return loginWithTypeCheck(email, password, "maloobchod");
}

export async function loginAdmin(
  usernameRaw: string,
  password: string,
): Promise<ActionResult> {
  const username = usernameRaw.trim().toLowerCase();
  if (!username || !password) {
    return { ok: false, error: "Nesprávne používateľské meno alebo heslo." };
  }

  let adminEmail: string | null = null;
  try {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("email, role, username")
      .eq("role", "admin")
      .ilike("username", username)
      .maybeSingle();

    if (profile?.email) {
      adminEmail = profile.email;
    }
  } catch {
    return {
      ok: false,
      error: "Prihlásenie administrátora nie je nakonfigurované.",
    };
  }

  if (!adminEmail) {
    return { ok: false, error: "Nesprávne používateľské meno alebo heslo." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Nesprávne používateľské meno alebo heslo." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, error: "Tento účet nemá prístup do administrácie." };
  }

  return { ok: true, data: undefined };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role === "admin") return null;
  if (profile.status !== "aktivny") return null;

  return profileToCustomer(profile);
}

export async function updateOwnProfile(input: {
  name: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  company?: string;
  ico?: string;
  dic?: string;
}): Promise<ActionResult<{ customer: Customer }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie ste prihlásený." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: input.name.trim(),
      phone: input.phone.trim(),
      street: input.street.trim(),
      city: input.city.trim(),
      zip: input.zip.trim(),
      country: input.country.trim() || "Slovensko",
      company: input.company?.trim() || null,
      ico: input.ico?.trim() || null,
      dic: input.dic?.trim() || null,
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Uloženie zlyhalo." };
  }

  revalidatePath("/ucet");
  return { ok: true, data: { customer: profileToCustomer(data) } };
}

export async function countPendingWholesaleRegistrations(): Promise<number> {
  const admin = await requireAdmin();
  if (!admin.ok) return 0;

  const { count, error } = await admin.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "customer")
    .eq("type", "velkoobchod")
    .eq("status", "ziada_registraciu");

  if (error) return 0;
  return count ?? 0;
}

export async function listCustomers(): Promise<ActionResult<{ customers: Customer[] }>> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { data, error } = await admin.supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: { customers: (data ?? []).map(profileToCustomer) },
  };
}

async function setCustomerStatus(
  id: string,
  status: CustomerStatus,
  options?: { setRegisteredAt?: boolean; clearRegisteredAt?: boolean },
): Promise<ActionResult<{ customer: Customer }>> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const patch: ProfileUpdate = { status };
  if (options?.setRegisteredAt) {
    patch.registered_at = new Date().toISOString();
  }
  if (options?.clearRegisteredAt) {
    patch.registered_at = null;
  }

  const { data, error } = await admin.supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .eq("role", "customer")
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Aktualizácia zlyhala." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/zakaznici");
  revalidatePath("/admin/velkoobchodne-ucty");
  return { ok: true, data: { customer: profileToCustomer(data) } };
}

export async function approveCustomer(id: string) {
  return setCustomerStatus(id, "aktivny", { setRegisteredAt: true });
}

export async function rejectCustomer(id: string) {
  return setCustomerStatus(id, "zamietnuty");
}

export async function blockCustomer(id: string) {
  return setCustomerStatus(id, "zablokovany");
}

export async function unblockCustomer(id: string) {
  return setCustomerStatus(id, "aktivny", { setRegisteredAt: true });
}

export async function restoreCustomerRequest(id: string) {
  return setCustomerStatus(id, "ziada_registraciu", { clearRegisteredAt: true });
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  try {
    const service = createServiceClient();
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) {
      return { ok: false, error: error.message };
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Mazanie účtu zlyhalo.";
    return { ok: false, error: message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/zakaznici");
  revalidatePath("/admin/velkoobchodne-ucty");
  return { ok: true, data: undefined };
}
