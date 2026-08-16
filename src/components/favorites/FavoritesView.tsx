"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { addLinesToCart } from "@/lib/cart";
import { FAVORITES_EVENT, getFavoriteProducts } from "@/lib/favorites";
import type { Product } from "@/lib/products";

export function FavoritesView() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

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

  function handleAddAll() {
    const result = addLinesToCart(
      items.map((product) => ({ product, quantity: 1 })),
    );

    if (result.added === 0) {
      setFlash(
        result.skipped > 0
          ? "Produkty nie sú na sklade."
          : "Nepodarilo sa pridať do košíka.",
      );
      return;
    }

    if (result.skipped > 0) {
      setFlash(`${result.added} pridané, ${result.skipped} nie je na sklade.`);
    }
    router.push("/kosik");
  }

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#75825B]/25" />
      </div>
    );
  }

  return (
    <>
      {flash ? (
        <p className="mb-4 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
          {flash}
        </p>
      ) : null}
      <ProductCollectionBrowser
        title="Obľúbené"
        products={items}
        sortSoldOutLast
        listenInventory
        headerAction={
          items.length > 0 ? (
            <button
              type="button"
              onClick={handleAddAll}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:px-5"
            >
              <ShoppingCart className="size-4" strokeWidth={1.75} aria-hidden />
              Pridať všetky do košíka
            </button>
          ) : null
        }
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
    </>
  );
}
