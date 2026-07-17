"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { categoryHref, categoryList, navItems } from "@/lib/navigation";

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const menuId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setMenuReady(true);
    setOpen(true);
  };

  const closeMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(false);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <nav aria-label="Hlavní navigace" className="relative">
      <div className="relative z-20 bg-[#75825B]">
        <div className="mx-auto flex h-14 w-[var(--content-width)] items-center justify-between gap-8">
          <ul className="flex items-center gap-10">
            <li onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls={menuId}
                className="relative inline-flex cursor-pointer items-center gap-1.5 py-1 text-base font-medium text-white/85 transition-colors hover:text-white"
              >
                Kategórie
                <ChevronDown
                  className={`size-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            </li>

            {navItems.map((item) => (
              <li key={item.href} onMouseEnter={scheduleClose}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="relative inline-flex cursor-pointer py-1 text-base font-medium text-white/85 transition-colors hover:text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-px after:origin-left after:scale-x-0 after:bg-white after:transition-transform after:duration-200 hover:after:scale-x-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div
            className="flex shrink-0 items-center gap-6 text-sm font-medium text-white/90"
            onMouseEnter={scheduleClose}
          >
            <a
              href="tel:+421900123456"
              className="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-white"
            >
              <Phone className="size-4" strokeWidth={1.75} aria-hidden />
              <span>0900 123 456</span>
            </a>
            <a
              href="mailto:info@pacidekor.sk"
              className="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-white"
            >
              <Mail className="size-4" strokeWidth={1.75} aria-hidden />
              <span>info@pacidekor.sk</span>
            </a>
          </div>
        </div>
      </div>

      <div
        id={menuId}
        className={`absolute inset-x-0 top-full z-10 overflow-hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div
          className={`border-b border-black/5 bg-[#faf8f5] shadow-[0_16px_40px_rgba(45,35,25,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          {menuReady ? (
            <div className="mx-auto grid w-[var(--content-width)] grid-cols-3 gap-2.5 py-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
              {categoryList.map(({ label, image }) => (
                <Link
                  key={label}
                  href={categoryHref(label)}
                  prefetch={false}
                  onClick={closeMenu}
                  className="group flex cursor-pointer flex-col items-center gap-2 text-center transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 30vw, 8vw"
                      className="object-cover"
                    />
                  </div>
                  <span className="font-heading text-xs leading-tight text-[#3d342c] transition-colors group-hover:text-[#75825B] sm:text-sm">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
