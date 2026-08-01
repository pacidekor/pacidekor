"use client";

import { createClient } from "@/lib/supabase/client";
import {
  profileToCustomer,
  type Customer,
  type CustomerType,
} from "@/lib/customers";
import type { ProfileRow } from "@/lib/supabase/database.types";

export type ClientSession = {
  customerId: string;
  type: CustomerType;
};

export const CLIENT_AUTH_EVENT = "pacidekor:client-auth-changed";

/** null = not resolved yet; avoids a Supabase round-trip on every heart click. */
let cachedAuthenticated: boolean | null = null;
let refreshPromise: Promise<boolean> | null = null;

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLIENT_AUTH_EVENT));
}

function setAuthCache(value: boolean) {
  cachedAuthenticated = value;
}

/** Synchronous cache read for instant UI (e.g. favorite toggle). */
export function getCachedClientAuthenticated(): boolean | null {
  return cachedAuthenticated;
}

export async function fetchClientCustomer(): Promise<Customer | null> {
  const supabase = createClient();
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

  return profileToCustomer(profile as ProfileRow);
}

export async function getClientSession(): Promise<ClientSession | null> {
  const customer = await fetchClientCustomer();
  if (!customer) return null;
  return { customerId: customer.id, type: customer.type };
}

async function refreshAuthCache(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = getClientSession()
    .then((session) => {
      const next = session !== null;
      setAuthCache(next);
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function isClientAuthenticated(): Promise<boolean> {
  if (cachedAuthenticated !== null) {
    void refreshAuthCache();
    return cachedAuthenticated;
  }
  return refreshAuthCache();
}

export async function clearClientSession(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  setAuthCache(false);
  emitAuthChanged();
}

/** Call after successful login/register so UI listeners refresh. */
export function notifyClientAuthChanged() {
  setAuthCache(null);
  void refreshAuthCache().then(() => emitAuthChanged());
}

export function subscribeClientAuth(onChange: () => void): () => void {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    setAuthCache(null);
    void refreshAuthCache().then(onChange);
  });

  window.addEventListener(CLIENT_AUTH_EVENT, onChange);
  return () => {
    subscription.unsubscribe();
    window.removeEventListener(CLIENT_AUTH_EVENT, onChange);
  };
}
