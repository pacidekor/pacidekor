"use client";

import { useEffect, useState } from "react";
import {
  CART_EVENT,
  readCartItems,
  type CartItem,
} from "@/lib/cart";
import { subscribeProductCatalog } from "@/lib/product-catalog";

/** Live cart items synced across components via localStorage + CART_EVENT. */
export function useCartItems() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    function sync() {
      setItems(readCartItems());
    }

    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    const unsubscribeCatalog = subscribeProductCatalog(sync);

    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
      unsubscribeCatalog();
    };
  }, []);

  return items;
}
