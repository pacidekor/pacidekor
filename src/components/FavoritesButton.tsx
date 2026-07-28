"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import {
  FAVORITES_EVENT,
  favoriteCountLabel,
  getFavoriteProducts,
} from "@/lib/favorites";
import { productHref, type Product } from "@/lib/products";

function FavoriteItems({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect?: () => void;
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
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={productHref(product.slug)}
            prefetch={false}
            onClick={onSelect}
            className="flex items-center gap-3 py-3 transition-colors hover:bg-black/[0.03]"
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
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FavoritesButton() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const count = products.length;

  useEffect(() => {
    function sync() {
      setProducts(getFavoriteProducts());
    }

    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener("storage", sync);
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
            />
          </div>

          <div className="bg-[#faf8f5] px-4 py-3.5">
            <Link
              href="/oblubene"
              onClick={() => setOpen(false)}
              className={`inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-medium transition-opacity hover:opacity-90 ${
                count > 0
                  ? "bg-[#75825B] text-white"
                  : "border border-black/10 bg-white text-[#2f2924]"
              }`}
            >
              Prejsť do obľúbených
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
