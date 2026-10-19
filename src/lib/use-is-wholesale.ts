"use client";

import { useLayoutEffect, useState } from "react";
import {
  fetchClientCustomer,
  subscribeClientAuth,
} from "@/lib/client-auth";

const STORAGE_KEY = "pk-is-wholesale";

/** null = not resolved yet; false/true after first fetch. */
let wholesaleCache: boolean | null = null;
let wholesalePromise: Promise<boolean> | null = null;
const wholesaleListeners = new Set<(value: boolean) => void>();

function readStoredWholesale(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value === "1") return true;
    if (value === "0") return false;
  } catch {
    // private mode / blocked storage
  }
  return null;
}

function writeStoredWholesale(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

function notifyWholesaleListeners(value: boolean) {
  for (const listener of wholesaleListeners) {
    listener(value);
  }
}

function setWholesaleCache(next: boolean) {
  wholesaleCache = next;
  writeStoredWholesale(next);
  notifyWholesaleListeners(next);
}

async function refreshWholesaleCache(): Promise<boolean> {
  if (wholesalePromise) return wholesalePromise;

  wholesalePromise = fetchClientCustomer()
    .then((customer) => {
      const next = customer?.type === "velkoobchod";
      setWholesaleCache(next);
      return next;
    })
    .finally(() => {
      wholesalePromise = null;
    });

  return wholesalePromise;
}

/**
 * Audience flag for prices (VO vs maloobchod markup).
 *
 * - SSR / first React state: false (safe for guests; avoids VO price in HTML).
 * - Before paint: restore last known value from memory/sessionStorage so
 *   logged-in VO users do not flash public (+50 %) prices on navigation.
 * - Then refresh from Supabase session.
 */
export function useIsWholesale(): boolean {
  const [isWholesale, setIsWholesale] = useState(false);

  useLayoutEffect(() => {
    // Restore sync before browser paint — kills retail→VO flicker.
    if (wholesaleCache === null) {
      const stored = readStoredWholesale();
      if (stored !== null) wholesaleCache = stored;
    }
    if (wholesaleCache !== null) {
      setIsWholesale(wholesaleCache);
    }

    const onChange = (value: boolean) => setIsWholesale(value);
    wholesaleListeners.add(onChange);

    void refreshWholesaleCache();

    const unsubscribeAuth = subscribeClientAuth(() => {
      // Keep previous audience until the new fetch resolves (no forced retail flash).
      void refreshWholesaleCache();
    });

    return () => {
      wholesaleListeners.delete(onChange);
      unsubscribeAuth();
    };
  }, []);

  return isWholesale;
}
