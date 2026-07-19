"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { popularSearches } from "@/lib/search";

function ClearIcon() {
  return (
    <span className="relative block size-3" aria-hidden>
      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 rotate-45 bg-current" />
      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 -rotate-45 bg-current" />
    </span>
  );
}

export function DesktopSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
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
      className="absolute left-1/2 w-[min(42rem,46%)] -translate-x-1/2"
    >
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="relative"
      >
        <label htmlFor="site-search" className="sr-only">
          Hľadať
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/40"
            aria-hidden
          />
          <input
            ref={inputRef}
            id="site-search"
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hľadať produkty…"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={panelId}
            onFocus={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              setOpen(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            className="h-11 w-full rounded-xl border border-black/10 bg-white/70 pr-10 pl-10 text-sm text-foreground outline-none placeholder:text-foreground/40 transition-colors focus:border-[#75825B] focus:bg-white focus:ring-2 focus:ring-[#75825B]/20"
          />
          {query ? (
            <button
              type="button"
              aria-label="Vymazať"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#2f2924]/45 transition-colors hover:bg-black/5 hover:text-[#2f2924]/75"
            >
              <ClearIcon />
            </button>
          ) : null}
        </div>
      </form>

      <div
        id={panelId}
        role="listbox"
        aria-label="Odporúčané hľadania"
        className={`absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-black/6 bg-white/95 shadow-[0_12px_28px_rgba(45,35,25,0.1)] backdrop-blur-sm transition-all duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <div className="px-4 py-3.5">
          <p className="mb-2.5 text-[11px] font-medium tracking-[0.12em] text-[#2f2924]/40 uppercase">
            Odporúčané
          </p>
          <div className="flex flex-wrap gap-1.5">
            {popularSearches.map((term) => (
              <button
                key={term}
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(term);
                  inputRef.current?.focus();
                  setOpen(false);
                }}
                className="inline-flex cursor-pointer items-center rounded-full bg-[#f4f1ec] px-3 py-1.5 text-sm text-[#2f2924]/75 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
