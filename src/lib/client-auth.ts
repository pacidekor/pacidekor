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

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLIENT_AUTH_EVENT));
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

export async function isClientAuthenticated(): Promise<boolean> {
  return (await getClientSession()) !== null;
}

export async function clearClientSession(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  emitAuthChanged();
}

/** Call after successful login/register so UI listeners refresh. */
export function notifyClientAuthChanged() {
  emitAuthChanged();
}

export function subscribeClientAuth(onChange: () => void): () => void {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    onChange();
  });

  window.addEventListener(CLIENT_AUTH_EVENT, onChange);
  return () => {
    subscription.unsubscribe();
    window.removeEventListener(CLIENT_AUTH_EVENT, onChange);
  };
}
