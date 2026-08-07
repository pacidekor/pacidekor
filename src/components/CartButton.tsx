"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, X } from "lucide-react";
import {
  cartItemCount,
  cartSubtotal,
  formatPrice,
  type CartItem,
} from "@/lib/cart";
import { productHref } from "@/lib/products";
import { productCountLabel } from "@/lib/product-count";
import { useCartItems } from "@/lib/use-cart";

type CartButtonProps = {
  variant?: "desktop" | "mobile";
  /** Controlled open state (useful on mobile). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function CartItems({
  items,
  onSelect,
}: {
  items: CartItem[];
  onSelect?: () => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-[#2f2924]/55">
        Váš košík je zatiaľ prázdny.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-black/6">
      {items.map(({ product, quantity }) => (
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
              <span className="mt-1 block text-sm text-[#2f2924]/55">
                <span className="font-semibold text-[#2f2924]">
                  {product.price}
                </span>
                <span className="mx-1.5 text-[#2f2924]/30">·</span>
                <span>{quantity}&nbsp;ks</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CartFooter({
  subtotal,
  onSelect,
}: {
  subtotal: number;
  onSelect?: () => void;
}) {
  return (
    <div className="border-t border-black/8 pt-3.5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm text-[#2f2924]/60">Medzisúčet</span>
        <span className="font-heading text-lg font-semibold text-[#2f2924]">
          {formatPrice(subtotal)}
        </span>
      </div>
      <Link
        href="/kosik"
        onClick={onSelect}
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Prejsť do košíka
      </Link>
    </div>
  );
}

export function CartButton({
  variant = "desktop",
  open: openProp,
  onOpenChange,
}: CartButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const items = useCartItems();
  const count = cartItemCount(items);
  const subtotal = cartSubtotal(items);
  const isMobile = variant === "mobile";

  const setOpenState = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open || isMobile) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpenState(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenState(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isMobile]);

  const trigger = (
    <button
      type="button"
      aria-label={`Košík, ${productCountLabel(count)}`}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpenState(!open)}
      className={
        isMobile
          ? "relative inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-[#2f2924] transition-colors hover:bg-black/5"
          : "relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white text-[#3d342c] transition-colors hover:bg-white/90"
      }
    >
      <ShoppingCart
        className={isMobile ? "size-6" : "size-5"}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#75825B] px-1 text-[11px] font-semibold leading-none text-white">
        {count}
      </span>
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}

        <div
          className={`fixed inset-x-0 top-16 bottom-0 z-40 md:hidden ${
            open ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <button
            type="button"
            aria-label="Zavrieť košík"
            className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpenState(false)}
          />

          <div
            id={panelId}
            role="dialog"
            aria-label="Košík"
            aria-hidden={!open}
            className={`relative flex max-h-[calc(100dvh-4rem)] flex-col border-b border-black/8 bg-[#e8ebe2] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "translate-y-0" : "-translate-y-3 opacity-0"
            }`}
          >
            <div className="mx-auto flex min-h-0 w-[var(--content-width)] flex-1 flex-col py-5">
              <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-xl font-semibold text-[#2f2924]">
                    Košík
                  </p>
                  <p className="mt-0.5 text-sm text-[#2f2924]/55">
                    {productCountLabel(count)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Zavrieť košík"
                  onClick={() => setOpenState(false)}
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/45 transition-colors hover:bg-black/5 hover:text-[#2f2924]"
                >
                  <X className="size-5" strokeWidth={1.75} aria-hidden />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-black/8 bg-white/90 px-3.5">
                <CartItems
                  items={items}
                  onSelect={() => setOpenState(false)}
                />
              </div>

              {items.length > 0 ? (
                <div className="mt-4 shrink-0">
                  <CartFooter
                    subtotal={subtotal}
                    onSelect={() => setOpenState(false)}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpenState(true)}
      onMouseLeave={() => setOpenState(false)}
    >
      {trigger}

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
          aria-label="Košík"
          aria-hidden={!open}
          className="w-[min(22.5rem,calc(100vw-1.25rem))] overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_16px_40px_rgba(45,35,25,0.14)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-black/6 px-4 py-3.5">
            <div>
              <p className="font-heading text-lg font-semibold text-[#2f2924]">
                Košík
              </p>
              <p className="mt-0.5 text-sm text-[#2f2924]/55">
                {productCountLabel(count)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Zavrieť košík"
              onClick={() => setOpenState(false)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-black/5 hover:text-[#2f2924]"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div className="max-h-[min(18rem,45vh)] overflow-y-auto px-4">
            <CartItems items={items} onSelect={() => setOpenState(false)} />
          </div>

          {items.length > 0 ? (
            <div className="bg-[#faf8f5] px-4 py-3.5">
              <CartFooter
                subtotal={subtotal}
                onSelect={() => setOpenState(false)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
