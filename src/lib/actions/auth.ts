"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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
import { birthDateError, normalizeBirthDate } from "@/lib/birth-date";
import {
  companyError,
  emailError,
  icoError,
  phoneError,
  sanitizeIco,
  sanitizePhone,
  sanitizeZip,
  zipError,
} from "@/lib/form-validation";
import { createAdminClient, createCustomerClient, createServiceClient } from "@/lib/supabase/server";
import type { ProfileRow, ProfileUpdate } from "@/lib/supabase/database.types";
import {
  issueAndSendEmailVerifyCode,
  notifyWholesaleApproved,
  verifyEmailCode,
  type EmailVerifyPurpose,
} from "@/lib/email-verification-server";
import { normalizeEmailVerifyCode } from "@/lib/email-verification";
import {
  sendEmailChangedNotifications,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from "@/lib/auth-emails";

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function validateWholesaleInput(
  input: WholesaleRegistrationInput,
): string | null {
  return (
    companyError(input.company) ||
    icoError(input.ico) ||
    emailError(input.email) ||
    phoneError(input.phone) ||
    (!input.street.trim() ? "Zadajte ulicu." : null) ||
    (!input.city.trim() ? "Zadajte mesto." : null) ||
    zipError(input.zip) ||
    (!input.country.trim() ? "Zadajte krajinu." : null) ||
    (!input.name.trim() ? "Zadajte kontaktnú osobu." : null) ||
    birthDateError(input.birthDate) ||
    (input.password.length < 6 ? "Heslo musí mať aspoň 6 znakov." : null)
  );
}

function validateRetailInput(input: RetailRegistrationInput): string | null {
  return (
    (!input.name.trim() ? "Zadajte meno a priezvisko." : null) ||
    emailError(input.email) ||
    phoneError(input.phone) ||
    (!input.street.trim() ? "Zadajte ulicu." : null) ||
    (!input.city.trim() ? "Zadajte mesto." : null) ||
    zipError(input.zip) ||
    (!input.country.trim() ? "Zadajte krajinu." : null) ||
    birthDateError(input.birthDate) ||
    (input.password.length < 6 ? "Heslo musí mať aspoň 6 znakov." : null)
  );
}

async function requireAdmin() {
  const supabase = await createAdminClient();
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
  const validationError = validateWholesaleInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const email = normalizeEmail(input.email);
  const birthDate = normalizeBirthDate(input.birthDate);
  const supabase = await createCustomerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        type: "velkoobchod",
        status: "ziada_registraciu",
        name: input.name.trim(),
        phone: sanitizePhone(input.phone),
        company: input.company.trim(),
        ico: sanitizeIco(input.ico),
        dic: input.dic?.trim() || "",
        street: input.street.trim(),
        city: input.city.trim(),
        zip: sanitizeZip(input.zip),
        country: input.country.trim() || "Slovensko",
        note: input.note?.trim() || "",
        ...(birthDate ? { birth_date: birthDate } : {}),
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

  const verifySend = await issueAndSendEmailVerifyCode({
    email,
    customerName: input.name.trim(),
    purpose: "wholesale_register",
    companyName: input.company.trim(),
  });
  if (!verifySend.ok) {
    console.error("registerWholesale verify e-mail:", verifySend.error);
  }

  return { ok: true, data: { customerId: data.user.id } };
}

export async function registerRetail(
  input: RetailRegistrationInput,
): Promise<ActionResult<{ customer: Customer }>> {
  const validationError = validateRetailInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const email = normalizeEmail(input.email);
  const birthDate = normalizeBirthDate(input.birthDate);
  const supabase = await createCustomerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        type: "maloobchod",
        status: "aktivny",
        name: input.name.trim(),
        phone: sanitizePhone(input.phone),
        street: input.street.trim(),
        city: input.city.trim(),
        zip: sanitizeZip(input.zip),
        country: input.country.trim() || "Slovensko",
        ...(birthDate ? { birth_date: birthDate } : {}),
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

  const verifySend = await issueAndSendEmailVerifyCode({
    email,
    customerName: input.name.trim(),
    purpose: "retail_register",
  });
  if (!verifySend.ok) {
    console.error("registerRetail verify e-mail:", verifySend.error);
  }

  return { ok: true, data: { customer: profileToCustomer(profile) } };
}

async function loginWithTypeCheck(
  emailRaw: string,
  password: string,
  expectedType: CustomerType,
): Promise<ActionResult<{ customer: Customer }>> {
  const email = normalizeEmail(emailRaw);
  const supabase = await createCustomerClient();

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

  const supabase = await createAdminClient();
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

export async function logoutCustomer(): Promise<void> {
  const supabase = await createCustomerClient();
  await supabase.auth.signOut();
}

export async function logoutAdmin(): Promise<void> {
  const supabase = await createAdminClient();
  await supabase.auth.signOut();
}

/** @deprecated Use logoutCustomer or logoutAdmin. */
export async function logout(): Promise<void> {
  await logoutCustomer();
}

/** Sends password-reset e-mail (retail + wholesale). Always OK to avoid enumeration. */
export async function requestPasswordReset(
  emailRaw: string,
): Promise<ActionResult<null>> {
  const emailCheck = emailError(emailRaw);
  if (emailCheck) return { ok: false, error: emailCheck };

  const email = normalizeEmail(emailRaw);
  const origin = await siteOrigin();

  try {
    const db = createServiceClient();
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    // Enumeration-safe: only generate/send when the account exists.
    if (profile) {
      await sendPasswordResetEmail({
        email,
        redirectTo: `${origin}/obnova-hesla`,
      });
    }
  } catch (error) {
    console.error("requestPasswordReset:", error);
  }

  return { ok: true, data: null };
}

export async function updatePasswordAfterReset(
  password: string,
): Promise<ActionResult<null>> {
  if (password.length < 6) {
    return { ok: false, error: "Heslo musí mať aspoň 6 znakov." };
  }

  const supabase = await createCustomerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Odkaz na obnovenie hesla je neplatný alebo expirovaný.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  if (user.email) {
    void sendPasswordChangedEmail({ email: user.email });
  }

  return { ok: true, data: null };
}

export async function changeOwnPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult<null>> {
  if (input.newPassword.length < 6) {
    return { ok: false, error: "Nové heslo musí mať aspoň 6 znakov." };
  }
  if (input.currentPassword === input.newPassword) {
    return { ok: false, error: "Nové heslo musí byť iné ako súčasné." };
  }

  const supabase = await createCustomerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nie ste prihlásený." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });
  if (reauthError) {
    return { ok: false, error: "Súčasné heslo nie je správne." };
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });
  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  void sendPasswordChangedEmail({ email: user.email });

  return { ok: true, data: null };
}

export async function changeOwnEmail(input: {
  newEmail: string;
  currentPassword: string;
}): Promise<ActionResult<{ email: string; needsConfirmation: boolean }>> {
  const emailCheck = emailError(input.newEmail);
  if (emailCheck) return { ok: false, error: emailCheck };

  const newEmail = normalizeEmail(input.newEmail);
  const supabase = await createCustomerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nie ste prihlásený." };
  }

  if (normalizeEmail(user.email) === newEmail) {
    return { ok: false, error: "Toto je už váš aktuálny e-mail." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });
  if (reauthError) {
    return { ok: false, error: "Heslo nie je správne." };
  }

  // Prevent colliding with another profile early (best-effort).
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", newEmail)
    .maybeSingle();
  if (existing && existing.id !== user.id) {
    return { ok: false, error: "Tento e-mail už používa iný účet." };
  }

  const origin = await siteOrigin();
  const oldEmail = user.email;
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${origin}/ucet` },
  );
  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  void sendEmailChangedNotifications({
    oldEmail,
    newEmail,
  });

  return {
    ok: true,
    data: { email: newEmail, needsConfirmation: true },
  };
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const supabase = await createCustomerClient();
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
  birthDate?: string;
}): Promise<ActionResult<{ customer: Customer }>> {
  const birthErr = birthDateError(input.birthDate);
  if (birthErr) return { ok: false, error: birthErr };

  const supabase = await createCustomerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie ste prihlásený." };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.type === "velkoobchod") {
    const companyErr = companyError(input.company ?? "");
    if (companyErr) return { ok: false, error: companyErr };
  }

  const birthDate = normalizeBirthDate(input.birthDate) ?? null;

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
      birth_date: birthDate,
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
  const result = await setCustomerStatus(id, "aktivny", { setRegisteredAt: true });
  if (result.ok && result.data.customer.type === "velkoobchod") {
    const customer = result.data.customer;
    void notifyWholesaleApproved({
      email: customer.email,
      customerName: customer.name,
      companyName: customer.company?.trim() || customer.name,
    });
  }
  return result;
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

/** Client: overenie 5-miestneho kódu z e-mailu po registrácii. */
export async function verifyEmailCodeAction(input: {
  email: string;
  code: string;
}): Promise<ActionResult> {
  const emailCheck = emailError(input.email);
  if (emailCheck) return { ok: false, error: emailCheck };
  return verifyEmailCode({
    email: input.email,
    code: normalizeEmailVerifyCode(input.code),
  });
}

/** Client: znova odoslať overovací kód (použije uložený purpose / meno). */
export async function resendEmailVerifyCodeAction(
  emailRaw: string,
): Promise<ActionResult> {
  const emailCheck = emailError(emailRaw);
  if (emailCheck) return { ok: false, error: emailCheck };

  const email = normalizeEmail(emailRaw);
  const db = createServiceClient();
  const { data, error } = await db
    .from("email_verification_codes")
    .select("purpose, customer_name, company_name")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("resendEmailVerifyCodeAction:", error.message);
    return { ok: false, error: "Nepodarilo sa odoslať nový kód." };
  }
  if (!data) {
    return {
      ok: false,
      error: "Kód už nie je platný. Skúste registráciu znova.",
    };
  }

  return issueAndSendEmailVerifyCode({
    email,
    customerName: data.customer_name?.trim() || "",
    purpose: data.purpose as EmailVerifyPurpose,
    companyName: data.company_name?.trim() || undefined,
  });
}
