"use client";

import { useDeferredValue, useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Mail, Phone, Search, User } from "lucide-react";
import { CartButton } from "@/components/CartButton";
import { ProductSearchResults } from "@/components/ProductSearchResults";
import { categoryHref, categoryList, navItems } from "@/lib/navigation";
import { popularSearches, searchProducts } from "@/lib/search";

type MenuView = "main" | "categories";

export function MobileHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("main");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const menuId = useId();
  const searchId = useId();

  const trimmedQuery = deferredQuery.trim();
  const isTyping = trimmedQuery.length > 0;
  const suggestions = isTyping ? searchProducts(trimmedQuery) : [];

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
    setMenuView("main");
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      const timeout = window.setTimeout(() => setMenuView("main"), 280);
      return () => window.clearTimeout(timeout);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen && !searchOpen && !cartOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menuOpen && menuView === "categories") {
          setMenuView("main");
          return;
        }
        setMenuOpen(false);
        setSearchOpen(false);
        setCartOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, menuView, searchOpen, cartOpen]);

  const closeMenu = () => setMenuOpen(false);

  const linkClass =
    "flex items-center justify-between gap-3 rounded-2xl px-3 py-[clamp(0.85rem,2.8vw,1.15rem)] text-[clamp(1.2rem,4.6vw,1.55rem)] font-medium leading-snug text-[#2f2924] transition-colors hover:bg-[#e8ebe2]";

  return (
    <>
      <header className="relative z-50 border-b border-black/8 bg-[#e8ebe2] md:hidden">
        <div className="mx-auto flex h-16 w-[var(--content-width)] items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={menuOpen ? "Zavrieť menu" : "Otvoriť menu"}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => {
                setSearchOpen(false);
                setCartOpen(false);
                setMenuOpen((value) => !value);
              }}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-[#2f2924] transition-colors hover:bg-black/5"
            >
              {/* Transform-only morph: parallel → X (no top/bottom jumps) */}
              <span className="relative block h-3.5 w-5" aria-hidden>
                <span
                  className={`absolute top-0 left-0 h-0.5 w-full origin-center rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    menuOpen ? "translate-y-[6px] rotate-45" : "translate-y-0 rotate-0"
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-0.5 w-full origin-center rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    menuOpen
                      ? "-translate-y-[6px] -rotate-45"
                      : "translate-y-0 rotate-0"
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              aria-label={searchOpen ? "Zavrieť hľadanie" : "Hľadať"}
              aria-expanded={searchOpen}
              aria-controls={searchId}
              onClick={() => {
                setMenuOpen(false);
                setCartOpen(false);
                setSearchOpen((value) => !value);
              }}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-[#2f2924] transition-colors hover:bg-black/5"
            >
              <Search className="size-6" strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <Link
            href="/"
            className="font-heading text-xl tracking-[0.08em] text-foreground"
          >
            PACIDEKOR
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Účet"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-[#2f2924] transition-colors hover:bg-black/5"
            >
              <User className="size-6" strokeWidth={1.75} aria-hidden />
            </button>

            <CartButton
              variant="mobile"
              open={cartOpen}
              onOpenChange={(next) => {
                setCartOpen(next);
                if (next) {
                  setMenuOpen(false);
                  setSearchOpen(false);
                }
              }}
            />
          </div>
        </div>
      </header>

      <div
        id={menuId}
        className={`fixed inset-x-0 top-16 bottom-0 z-40 bg-[#faf8f5] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          menuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="relative h-full overflow-hidden">
          {/* Main menu */}
          <div
            className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              menuView === "main"
                ? "translate-x-0"
                : "pointer-events-none -translate-x-1/4"
            }`}
            aria-hidden={menuView !== "main"}
          >
            <nav
              aria-label="Hlavné menu"
              className="min-h-0 flex-1 overflow-y-auto px-[calc((100vw-var(--content-width))/2)] pt-[clamp(1.25rem,4vw,2rem)] pb-4"
            >
              <ul className="space-y-0.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setMenuView("categories")}
                    className={`${linkClass} w-full cursor-pointer text-left`}
                  >
                    <span>Kategórie</span>
                    <ChevronRight
                      className="size-[1.15em] shrink-0 opacity-45"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </button>
                </li>

                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="shrink-0 border-t border-black/8 bg-[#faf8f5] px-[calc((100vw-var(--content-width))/2)] py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <a
                href="tel:+421900123456"
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[clamp(0.95rem,3.6vw,1.1rem)] font-medium text-[#2f2924]/75 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
              >
                <Phone className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>0900 123 456</span>
              </a>
              <a
                href="mailto:info@pacidekor.sk"
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[clamp(0.95rem,3.6vw,1.1rem)] font-medium text-[#2f2924]/75 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
              >
                <Mail className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>info@pacidekor.sk</span>
              </a>
            </div>
          </div>

          {/* Categories submenu */}
          <div
            className={`absolute inset-0 overflow-y-auto bg-[#faf8f5] px-[calc((100vw-var(--content-width))/2)] py-[clamp(1.25rem,4vw,2rem)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              menuView === "categories"
                ? "translate-x-0"
                : "pointer-events-none translate-x-full"
            }`}
            aria-hidden={menuView !== "categories"}
          >
            <button
              type="button"
              onClick={() => setMenuView("main")}
              className="mb-2 inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2.5 text-[clamp(0.95rem,3.5vw,1.1rem)] font-medium text-[#2f2924]/65 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />
              Späť
            </button>

            <ul className="space-y-0.5 pb-8">
              {categoryList.map(({ label }) => (
                <li key={label}>
                  <Link
                    href={categoryHref(label)}
                    prefetch={false}
                    onClick={closeMenu}
                    className={linkClass}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Search panel under header */}
      <div
        className={`fixed inset-x-0 top-16 bottom-0 z-40 md:hidden ${
          searchOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Zavrieť hľadanie"
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
            searchOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSearchOpen(false)}
        />
        <div
          id={searchId}
          className={`relative border-b border-black/8 bg-[#e8ebe2] shadow-[0_12px_32px_rgba(45,35,25,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            searchOpen ? "translate-y-0" : "-translate-y-3 opacity-0"
          }`}
        >
          <div className="mx-auto w-[var(--content-width)] py-5">
            <form role="search" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="mobile-site-search" className="sr-only">
                Hľadať
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/40"
                  aria-hidden
                />
                <input
                  id="mobile-site-search"
                  type="search"
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Hľadať produkty…"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-black/10 bg-white pr-11 pl-11 text-base text-foreground outline-none placeholder:text-foreground/40 transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Vymazať"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#2f2924]/45 transition-colors hover:bg-black/5 hover:text-[#2f2924]/75"
                  >
                    <span className="relative block size-3" aria-hidden>
                      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 rotate-45 bg-current" />
                      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 -rotate-45 bg-current" />
                    </span>
                  </button>
                ) : null}
              </div>
            </form>

            <div className="mt-4">
              {isTyping ? (
                <>
                  <p className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/45 uppercase">
                    Produkty
                  </p>
                  <div className="search-scroll max-h-[min(22rem,55vh)] overflow-y-auto rounded-2xl border border-black/8 bg-white/90 p-1">
                    <ProductSearchResults
                      products={suggestions}
                      query={trimmedQuery}
                      onSelect={() => setSearchOpen(false)}
                      variant="mobile"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/45 uppercase">
                    Populárne hľadania
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="inline-flex cursor-pointer items-center rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
