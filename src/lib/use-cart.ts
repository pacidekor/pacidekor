"use client";

import { useEffect, useState } from "react";
import {
  CART_EVENT,
  getAccountCartHydrationState,
  readCartItems,
  type CartItem,
} from "@/lib/cart";
import { subscribeProductCatalog } from "@/lib/product-catalog";
import {
  getCachedClientAuthenticated,
  subscribeClientAuth,
} from "@/lib/client-auth";

export type CartItemsState = {
  items: CartItem[];
  /** True while account cart is waiting for server + product resolve. */
  loading: boolean;
  error: string | null;
};

/** Live cart items synced across components via localStorage + CART_EVENT. */
export function useCartItems(): CartItem[] {
  return useCartItemsState().items;
}

export function useCartItemsState(): CartItemsState {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function sync() {
      const auth = getCachedClientAuthenticated();
      const hydration = getAccountCartHydrationState();

      // Guest / auth not resolved yet — show localStorage cart immediately.
      if (auth !== true) {
        setItems(readCartItems());
        setLoading(false);
        setError(null);
        return;
      }

      if (hydration === "pending") {
        setLoading(true);
        setError(null);
        // Keep previous items if any (avoid flash empty).
        return;
      }

      if (hydration === "error") {
        setLoading(false);
        setError("Košík sa nepodarilo načítať. Skúste obnoviť stránku.");
        setItems(readCartItems());
        return;
      }

      setItems(readCartItems());
      setLoading(false);
      setError(null);
    }

    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    const unsubscribeCatalog = subscribeProductCatalog(sync);
    const unsubscribeAuth = subscribeClientAuth(() => {
      setLoading(true);
      sync();
    });

    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
      unsubscribeCatalog();
      unsubscribeAuth();
    };
  }, []);

  return { items, loading, error };
}
