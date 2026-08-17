"use client";

import { useEffect } from "react";
import {
  clearAccountCartCache,
  mergeGuestCartIntoAccount,
  hydrateAccountCart,
} from "@/lib/cart";
import {
  bootstrapFavoritesPreview,
  clearFavoritesCache,
  hydrateFavorites,
} from "@/lib/favorites";
import {
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

    // Paint heart counter ASAP from local cache (before cart / profile work).
    void bootstrapFavoritesPreview().then(() => {
      if (cancelled) return;
      // Reconcile with Supabase in parallel with cart merge below.
      void hydrateFavorites();
    });

    async function sync() {
      const ok = await isClientAuthenticated();
      if (cancelled) return;

      if (ok) {
        try {
          await mergeGuestCartIntoAccount();
        } catch {
          await hydrateAccountCart();
        }
        // Favorites already kicked off above; refresh once auth is confirmed.
        void hydrateFavorites();
      } else {
        clearAccountCartCache();
        clearFavoritesCache();
      }
    }

    void sync();

    return subscribeClientAuth(() => {
      void sync();
    });
  }, []);

  return null;
}
