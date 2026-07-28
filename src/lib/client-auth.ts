import type { CustomerType } from "@/lib/customers";

export const CLIENT_SESSION_KEY = "pacidekor-client-auth";

export type ClientSession = {
  customerId: string;
  type: CustomerType;
};

export function getClientSession(): ClientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientSession;
    if (
      typeof parsed.customerId !== "string" ||
      (parsed.type !== "velkoobchod" && parsed.type !== "maloobchod")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isClientAuthenticated(): boolean {
  return getClientSession() !== null;
}

export function setClientSession(session: ClientSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("pacidekor:client-auth-changed"));
}

export function clearClientSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CLIENT_SESSION_KEY);
  window.dispatchEvent(new Event("pacidekor:client-auth-changed"));
}

export const CLIENT_AUTH_EVENT = "pacidekor:client-auth-changed";
