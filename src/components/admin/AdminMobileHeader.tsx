"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { clearAdminSession } from "@/lib/admin-auth";
import { adminNavItems } from "@/lib/admin-nav";

export function AdminMobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await clearAdminSession();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/8 bg-[#e8ebe2] md:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <Link
            href="/admin"
            className="font-heading text-xl tracking-[0.08em] text-foreground transition-opacity hover:opacity-80"
          >
            PACIDEKOR
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Zavrieť menu" : "Otvoriť menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-[#2f2924] transition-colors hover:bg-black/5"
          >
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
        </div>
      </header>

      <div
        className={`fixed inset-x-0 top-16 bottom-0 z-40 md:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Zavrieť menu"
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />

        <div
          id={menuId}
          role="dialog"
          aria-label="Administrácia"
          aria-hidden={!menuOpen}
          className={`relative max-h-[min(85dvh,calc(100dvh-4rem))] overflow-hidden rounded-b-3xl border-b border-black/8 bg-[#e8ebe2] shadow-[0_16px_40px_rgba(47,41,36,0.14)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            menuOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-3 opacity-0"
          }`}
        >
          <nav
            aria-label="Administrácia"
            className="max-h-[min(70dvh,calc(100dvh-10rem))] overflow-y-auto px-3 pt-3 pb-2"
          >
            <ul className="space-y-1">
              {adminNavItems.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex h-12 items-center gap-3 rounded-2xl px-3 text-[1.05rem] transition-colors ${
                        active
                          ? "bg-[#75825B] font-medium text-white"
                          : "text-[#2f2924]/80 hover:bg-black/5 hover:text-[#2f2924]"
                      }`}
                    >
                      <Icon
                        className="size-5 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {active ? (
                        <ChevronRight
                          className="size-4 shrink-0 opacity-80"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-black/8 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white font-heading text-xs font-semibold text-[#75825B]">
                A
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-medium text-[#2f2924]">
                  Administrátor
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                aria-label="Odhlásiť sa"
                title="Odhlásiť sa"
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/55 transition-colors hover:bg-black/5 hover:text-[#2f2924]"
              >
                <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
