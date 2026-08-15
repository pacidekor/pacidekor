"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import type { Product } from "@/lib/products";

const PAGE_SIZE = 20;

type ProductSearchSelectProps = {
  products: Product[];
  onSelect: (product: Product) => void;
  placeholder?: string;
  emptyLabel?: string;
};

function matchesQuery(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    product.name.toLowerCase().includes(q) ||
    product.category.toLowerCase().includes(q) ||
    (product.sku?.toLowerCase().includes(q) ?? false)
  );
}

export function ProductSearchSelect({
  products,
  onSelect,
  placeholder = "Hľadať produkt podľa názvu alebo SKU…",
  emptyLabel = "Žiadny produkt",
}: ProductSearchSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const list = products.filter((product) => matchesQuery(product, query));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "sk"));
  }, [products, query]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [query, products, open]);

  function updateCoords() {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (!open) return;

    updateCoords();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onReposition() {
      updateCoords();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function handleListScroll() {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < 48) {
      setVisibleCount((count) =>
        Math.min(count + PAGE_SIZE, filtered.length),
      );
    }
  }

  function handleSelect(product: Product) {
    onSelect(product);
    setQuery("");
    setOpen(false);
  }

  const disabled = products.length === 0;

  const dropdown =
    open && !disabled && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[90] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_16px_40px_rgba(47,41,36,0.16)]"
          >
            <ul
              ref={scrollRef}
              onScroll={handleListScroll}
              className="max-h-64 overflow-y-auto py-1.5"
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-[#2f2924]/50">
                  Nič sme nenašli
                </li>
              ) : (
                visible.map((product) => (
                  <li key={product.id} role="option">
                    <button
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#faf8f5]"
                    >
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f3efe9]">
                        <Image
                          src={product.image}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#2f2924]">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[#2f2924]/50">
                          {product.sku
                            ? `${product.sku} · ${product.price}`
                            : `${product.category} · ${product.price}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          disabled={disabled}
          placeholder={disabled ? emptyLabel : placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          role="combobox"
          onFocus={() => {
            if (!disabled) {
              updateCoords();
              setOpen(true);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!disabled) {
              updateCoords();
              setOpen(true);
            }
          }}
          className="h-11 w-full rounded-xl border border-black/10 bg-white pr-3.5 pl-10 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15 disabled:cursor-not-allowed disabled:bg-[#faf8f5] disabled:opacity-60"
        />
      </div>
      {dropdown}
    </div>
  );
}
