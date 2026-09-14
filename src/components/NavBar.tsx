"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { useTaxonomy } from "@/components/ProductCatalogProvider";
import { categoryHrefById, categoryList, navItems } from "@/lib/navigation";
import { buildCategoryFilterHref } from "@/lib/taxonomy";

export function NavBar() {
  const pathname = usePathname();
  const taxonomy = useTaxonomy();
  const [open, setOpen] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const menuId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navCategories =
    taxonomy.categories.length > 0
      ? taxonomy.categories.map((category) => ({
          id: category.id,
          label: category.label,
          image:
            category.image ||
            categoryList.find((item) => item.slug === category.id)?.image ||
            "/kategorie/umelekvety.webp",
          href: categoryHrefById(category.id),
        }))
      : categoryList.map((category) => ({
          id: category.slug,
          label: category.label,
          image: category.image,
          href: categoryHrefById(category.slug),
        }));

  const subsByCategory = useMemo(() => {
    const map = new Map<
      string,
      { id: string; label: string; sortOrder: number }[]
    >();
    for (const sub of taxonomy.subcategories) {
      const list = map.get(sub.categoryId) ?? [];
      list.push({
        id: sub.id,
        label: sub.label,
        sortOrder: sub.sortOrder,
      });
      map.set(sub.categoryId, list);
    }

    const cleaned = new Map<string, { id: string; label: string }[]>();
    for (const [categoryId, list] of map) {
      cleaned.set(
        categoryId,
        [...list]
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder ||
              a.label.localeCompare(b.label, "sk"),
          )
          .map(({ id, label }) => ({ id, label })),
      );
    }
    return cleaned;
  }, [taxonomy.subcategories]);

  const activeSubs = activeCategoryId
    ? (subsByCategory.get(activeCategoryId) ?? [])
    : [];
  const activeCategoryLabel =
    navCategories.find((category) => category.id === activeCategoryId)
      ?.label ?? null;

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
    setActiveCategoryId(null);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setActiveCategoryId(null);
    }, 100);
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
    <nav aria-label="Hlavní navigace" className="relative hidden md:block">
      <div className="relative z-20 bg-[#75825B]">
        <div className="mx-auto flex h-14 w-[var(--content-width)] items-center justify-between gap-8">
          <ul className="flex items-center gap-10">
            <li onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls={menuId}
                className="relative inline-flex cursor-pointer items-center gap-1.5 py-1 text-base font-medium text-white/85 transition-[color,text-shadow] duration-200 hover:text-white hover:[text-shadow:0_0_0.35px_currentcolor]"
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
                  className="relative inline-flex cursor-pointer py-1 text-base font-medium text-white/85 transition-[color,text-shadow] duration-200 hover:text-white hover:[text-shadow:0_0_0.35px_currentcolor]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div
            className="flex shrink-0 items-center gap-6 text-sm"
            onMouseEnter={scheduleClose}
          >
            <a
              href="tel:+421910592948"
              className="inline-flex cursor-pointer items-center gap-2 font-medium text-white/85 transition-[color,text-shadow] duration-200 hover:text-white hover:[text-shadow:0_0_0.35px_currentcolor]"
            >
              <Phone className="size-4" strokeWidth={1.75} aria-hidden />
              <span>+421 910 592 948</span>
            </a>
            <a
              href="mailto:info@pacidekor.sk"
              className="inline-flex cursor-pointer items-center gap-2 font-medium text-white/85 transition-[color,text-shadow] duration-200 hover:text-white hover:[text-shadow:0_0_0.35px_currentcolor]"
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
            <div className="mx-auto w-[var(--content-width)] py-4">
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
                {navCategories.map(({ id, label, image, href }) => {
                  const hasSubs = (subsByCategory.get(id)?.length ?? 0) > 0;
                  const isActive = activeCategoryId === id;

                  return (
                    <Link
                      key={id}
                      href={href}
                      prefetch={false}
                      onClick={closeMenu}
                      onMouseEnter={() =>
                        setActiveCategoryId(hasSubs ? id : null)
                      }
                      className="group flex cursor-pointer flex-col items-center gap-2 text-center"
                    >
                      <div
                        className={`relative aspect-square w-full overflow-hidden rounded-xl bg-[#f3efe9] transition-[box-shadow,outline-color] duration-200 ${
                          isActive
                            ? "shadow-md outline outline-2 outline-[#75825B]"
                            : "shadow-sm group-hover:shadow-md"
                        }`}
                      >
                        {image.startsWith("http") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            className="absolute inset-0 size-full object-cover"
                          />
                        ) : (
                          <Image
                            src={image}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 30vw, 8vw"
                            quality={90}
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span
                        className={`font-heading text-xs leading-tight transition-colors sm:text-sm ${
                          isActive
                            ? "text-[#75825B]"
                            : "text-[#3d342c] group-hover:text-[#75825B]"
                        }`}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  activeSubs.length > 0
                    ? "mt-4 grid-rows-[1fr] opacity-100"
                    : "mt-0 grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div>
                    <p className="mb-2.5 text-xs font-medium tracking-[0.14em] text-[#75825B] uppercase">
                      Subkategórie
                      {activeCategoryLabel ? (
                        <span className="normal-case tracking-normal text-[#2f2924]/50">
                          {" "}
                          ({activeCategoryLabel})
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap justify-start gap-2">
                      {activeSubs.map((sub) => (
                        <Link
                          key={sub.id}
                          href={buildCategoryFilterHref(
                            activeCategoryId ?? "",
                            { sub: sub.id },
                          )}
                          prefetch={false}
                          onClick={closeMenu}
                          className="inline-flex h-11 cursor-pointer items-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-[#2f2924] transition-colors duration-200 hover:border-[#75825B] hover:bg-[#75825B] hover:text-white"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
