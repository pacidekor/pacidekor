"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { addLinesToCart } from "@/lib/cart";
import { ensureCatalogProducts } from "@/lib/ensure-catalog-products";
import {
  FAVORITES_EVENT,
  getFavoriteIdsSnapshot,
  getFavoriteProducts,
} from "@/lib/favorites";
import type { Product } from "@/lib/products";

export function FavoritesView() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      setStatus((prev) => (prev === "ready" ? prev : "loading"));
      const result = await ensureCatalogProducts(getFavoriteIdsSnapshot());
      if (cancelled) return;
      setItems(getFavoriteProducts());
      setStatus(result.ok ? "ready" : "error");
    }

    void sync();
    const onEvent = () => {
      void sync();
    };
    window.addEventListener(FAVORITES_EVENT, onEvent);
    window.addEventListener("storage", onEvent);
    return () => {
      cancelled = true;
      window.removeEventListener(FAVORITES_EVENT, onEvent);
      window.removeEventListener("storage", onEvent);
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

  if (status === "loading" && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#75825B]/25" />
        <p className="mt-4 text-sm text-[#2f2924]/55">Načítavam obľúbené…</p>
      </div>
    );
  }

  if (status === "error" && items.length === 0) {
    return (
      <div className="rounded-3xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-6 py-12 text-center">
        <p className="font-heading text-xl text-[#9a4d3f]">
          Obľúbené sa nepodarilo načítať
        </p>
        <p className="mt-2 text-sm text-[#9a4d3f]/85">
          Skúste obnoviť stránku.
        </p>
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
