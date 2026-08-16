"use client";

import { startTransition, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Heart, ShoppingCart, X } from "lucide-react";
import { addLinesToCart } from "@/lib/cart";
import {
  FAVORITES_EVENT,
  favoriteCountLabel,
  getFavoriteProducts,
} from "@/lib/favorites";
import {
  getInventoryForProduct,
  isInventoryAvailable,
} from "@/lib/inventory";
import { productHref, type Product } from "@/lib/products";

function feedbackMessage(added: number, skipped: number) {
  if (added === 0) {
    return skipped > 0
      ? "Produkty nie sú na sklade."
      : "Nepodarilo sa pridať do košíka.";
  }
  if (skipped > 0) {
    return `${added} pridané, ${skipped} nie je na sklade.`;
  }
  return added === 1 ? "Pridané do košíka." : `${added} produktov v košíku.`;
}

function FavoriteItems({
  products,
  onSelect,
  onAddedOne,
}: {
  products: Product[];
  onSelect?: () => void;
  onAddedOne?: (productId: string) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-[#2f2924]/55">
        Zatiaľ nemáte žiadne obľúbené produkty.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-black/6">
      {products.map((product) => {
        const available = isInventoryAvailable(getInventoryForProduct(product));
        return (
          <li key={product.id} className="flex items-center gap-2 py-3">
            <Link
              href={productHref(product.slug)}
              prefetch={false}
              onClick={onSelect}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl transition-colors hover:bg-black/[0.03]"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f3efe9] sm:size-16">
                <Image
                  src={product.image}
                  alt=""
                  fill
                  sizes="64px"
                  quality={90}
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium leading-snug text-[#2f2924]">
                  {product.name}
                </span>
                <span className="mt-1 block text-sm font-semibold text-[#2f2924]">
                  {product.price}
                  {!available ? (
                    <span className="ml-2 font-normal text-[#9a4d3f]">
                      Vypredané
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
            <button
              type="button"
              disabled={!available}
              aria-label={
                available
                  ? `Pridať ${product.name} do košíka`
                  : `${product.name} je vypredané`
              }
              onClick={() => {
                const result = addLinesToCart([{ product, quantity: 1 }]);
                if (result.added > 0) onAddedOne?.(product.id);
              }}
              className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/10 text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:bg-[#75825B]/8 hover:text-[#5f6a49] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-black/10 disabled:hover:bg-transparent disabled:hover:text-[#2f2924]"
            >
              <ShoppingCart className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function FavoritesButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = products.length;

  useEffect(() => {
    function sync() {
      startTransition(() => {
        setProducts(getFavoriteProducts());
      });
    }

    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  function showFlash(message: string) {
    setFlash(message);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlash(null), 2200);
  }

  function handleAddAll() {
    const result = addLinesToCart(
      products.map((product) => ({ product, quantity: 1 })),
    );
    showFlash(feedbackMessage(result.added, result.skipped));
    if (result.added > 0) {
      setTimeout(() => {
        setOpen(false);
        router.push("/kosik");
      }, 700);
    }
  }

  function handleAddedOne(_productId: string) {
    showFlash("Pridané do košíka.");
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Obľúbené, ${count} položiek`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white text-[#3d342c] transition-colors hover:bg-white/90"
      >
        <Heart className="size-5" strokeWidth={1.75} aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#75825B] px-1 text-[11px] font-semibold leading-none text-white">
            {count}
          </span>
        ) : null}
      </button>

      <div
        className={`absolute top-full right-0 z-50 pt-2 transition-all duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1.5 opacity-0"
        }`}
      >
        <div
          id={panelId}
          role="dialog"
          aria-label="Obľúbené"
          aria-hidden={!open}
          className="w-[min(22.5rem,calc(100vw-1.25rem))] overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_16px_40px_rgba(45,35,25,0.14)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-black/6 px-4 py-3.5">
            <div>
              <p className="font-heading text-lg font-semibold text-[#2f2924]">
                Obľúbené
              </p>
              <p className="mt-0.5 text-sm text-[#2f2924]/55">
                {favoriteCountLabel(count)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Zavrieť obľúbené"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-black/5 hover:text-[#2f2924]"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div className="max-h-[min(18rem,45vh)] overflow-y-auto px-4">
            <FavoriteItems
              products={products}
              onSelect={() => setOpen(false)}
              onAddedOne={handleAddedOne}
            />
          </div>

          {flash ? (
            <p className="flex items-center justify-center gap-1.5 border-t border-black/6 bg-[#75825B]/8 px-4 py-2 text-center text-xs font-medium text-[#5f6a49]">
              <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
              {flash}
            </p>
          ) : null}

          {count > 0 ? (
            <div className="space-y-2 bg-[#faf8f5] px-4 py-3.5">
              <button
                type="button"
                onClick={handleAddAll}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <ShoppingCart className="size-4" strokeWidth={1.75} aria-hidden />
                Pridať všetky do košíka
              </button>
              <Link
                href="/oblubene"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/35 hover:text-[#5f6a49]"
              >
                Prejsť do obľúbených
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
