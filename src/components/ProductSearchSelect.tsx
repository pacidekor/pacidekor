"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Product } from "@/lib/products";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = products.filter((product) => matchesQuery(product, query));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "sk"));
  }, [products, query]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(product: Product) {
    onSelect(product);
    setQuery("");
    setOpen(false);
  }

  const disabled = products.length === 0;

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="search"
          value={query}
          disabled={disabled}
          placeholder={disabled ? emptyLabel : placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          role="combobox"
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!disabled) setOpen(true);
          }}
          className="h-11 w-full rounded-xl border border-black/10 bg-white pr-3.5 pl-10 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15 disabled:cursor-not-allowed disabled:bg-[#faf8f5] disabled:opacity-60"
        />
      </div>

      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_16px_40px_rgba(47,41,36,0.16)]"
        >
          <ul className="max-h-64 overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[#2f2924]/50">
                Nič sme nenašli
              </li>
            ) : (
              filtered.map((product) => (
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
        </div>
      ) : null}
    </div>
  );
}
