"use client";

import { useEffect } from "react";
import {
  clearAccountCartCache,
  mergeGuestCartIntoAccount,
  hydrateAccountCart,
} from "@/lib/cart";
import {
  clearFavoritesCache,
  hydrateFavorites,
} from "@/lib/favorites";
import {
  getCachedClientAuthenticated,
  isClientAuthenticated,
  subscribeClientAuth,
} from "@/lib/client-auth";

/**
 * Keeps account-scoped cart + favorites in sync with auth.
 * Guests keep localStorage cart; favorites require login.
 */
export function AccountDataSync() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const ok = await isClientAuthenticated();
      if (cancelled) return;

      if (ok) {
        try {
          await mergeGuestCartIntoAccount();
        } catch {
          await hydrateAccountCart();
        }
        await hydrateFavorites();
      } else {
        clearAccountCartCache();
        clearFavoritesCache();
      }
    }

    if (getCachedClientAuthenticated() !== null) {
      void sync();
    } else {
      void sync();
    }

    return subscribeClientAuth(() => {
      void sync();
    });
  }, []);

  return null;
}
