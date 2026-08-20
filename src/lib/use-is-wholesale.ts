"use client";

import { useEffect, useState } from "react";
import {
  fetchClientCustomer,
  subscribeClientAuth,
} from "@/lib/client-auth";

/** null = not resolved yet; false/true after first fetch. */
let wholesaleCache: boolean | null = null;
let wholesalePromise: Promise<boolean> | null = null;
const wholesaleListeners = new Set<(value: boolean) => void>();

function notifyWholesaleListeners(value: boolean) {
  for (const listener of wholesaleListeners) {
    listener(value);
  }
}

async function refreshWholesaleCache(): Promise<boolean> {
  if (wholesalePromise) return wholesalePromise;

  wholesalePromise = fetchClientCustomer()
    .then((customer) => {
      const next = customer?.type === "velkoobchod";
      wholesaleCache = next;
      notifyWholesaleListeners(next);
      return next;
    })
    .finally(() => {
      wholesalePromise = null;
    });

  return wholesalePromise;
}

/**
 * True only after we confirm an active velkoobchod session.
 * Starts false so UI shows retail prices until resolved (no VO flicker).
 * Shared cache — many product cards share one session lookup.
 */
export function useIsWholesale(): boolean {
  const [isWholesale, setIsWholesale] = useState(
    () => wholesaleCache === true,
  );

  useEffect(() => {
    const onChange = (value: boolean) => setIsWholesale(value);
    wholesaleListeners.add(onChange);

    if (wholesaleCache !== null) {
      setIsWholesale(wholesaleCache);
    }
    void refreshWholesaleCache();

    const unsubscribeAuth = subscribeClientAuth(() => {
      wholesaleCache = null;
      void refreshWholesaleCache();
    });

    return () => {
      wholesaleListeners.delete(onChange);
      unsubscribeAuth();
    };
  }, []);

  return isWholesale;
}
