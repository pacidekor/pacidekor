"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { FAVORITES_EVENT, getFavoriteProducts } from "@/lib/favorites";
import type { Product } from "@/lib/products";

export function FavoritesView() {
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function sync() {
      setItems(getFavoriteProducts());
      setHydrated(true);
    }

    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#75825B]/25" />
      </div>
    );
  }

  return (
    <ProductCollectionBrowser
      title="Obľúbené"
      products={items}
      sortSoldOutLast
      listenInventory
      emptyState={
        <div className="rounded-3xl border border-black/8 bg-white px-6 py-14 text-center">
          <p className="font-heading text-xl font-semibold text-[#2f2924]">
            Zatiaľ žiadne obľúbené
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
            Pridajte produkty cez ikonu srdiečka a nájdete ich tu neskôr.
          </p>
          <Link
            href="/produkty"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Prehliadať produkty
          </Link>
        </div>
      }
    />
  );
}
