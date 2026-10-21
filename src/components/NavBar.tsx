"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { useTaxonomy } from "@/components/ProductCatalogProvider";
import { categoryHrefById, categoryList, navItems } from "@/lib/navigation";
import { buildCategoryFilterHref } from "@/lib/taxonomy";

/** One shared fill for category strip + subcategory panel (no seam / color drift). */
const CATEGORY_MENU_BG = "#faf8f5";
/** Hairline under the category strip — same on the tongue sides/bottom. */
const MENU_HAIRLINE = "rgba(0, 0, 0, 0.05)";
/** Matches Tailwind `rounded-xl` on the closed strip. */
const MENU_CORNER_R = 12;

/** L-shaped clip: full strip + tongue, rounded outer bottom corners. */
function menuPlateClipPath(opts: {
  plateW: number;
  stripH: number;
  left: number;
  width: number;
  tongueH: number;
  r?: number;
}): string {
  const { plateW, stripH, left, width, tongueH } = opts;
  const right = left + width;
  const bottom = stripH + tongueH;
  const tr = Math.min(
    opts.r ?? MENU_CORNER_R,
    width / 2,
    Math.max(0, tongueH),
  );
  const sr = Math.min(opts.r ?? MENU_CORNER_R, stripH);

  // Clockwise from top-left. Arc sweep=1 = clockwise (inner corner rounds).
  const parts: string[] = [`M 0 0`, `H ${plateW}`];
  const roundStripBR = plateW - right >= sr + 0.5;
  const roundStripBL = left >= sr + 0.5;

  // Strip bottom-right (only if there is room beside the tongue).
  if (roundStripBR) {
    parts.push(`V ${stripH - sr}`);
    if (sr > 0) {
      parts.push(`A ${sr} ${sr} 0 0 1 ${plateW - sr} ${stripH}`);
    }
    parts.push(`H ${right}`);
  } else {
    parts.push(`V ${stripH}`);
    if (right < plateW - 0.5) parts.push(`H ${right}`);
  }

  // Tongue right edge + bottom-right round.
  parts.push(`V ${bottom - tr}`);
  if (tr > 0) {
    parts.push(`A ${tr} ${tr} 0 0 1 ${right - tr} ${bottom}`);
  }
  parts.push(`H ${left + tr}`);
  if (tr > 0) {
    parts.push(`A ${tr} ${tr} 0 0 1 ${left} ${bottom - tr}`);
  }

  // Tongue left edge back to strip.
  parts.push(`V ${stripH}`);

  // Strip bottom-left (only if there is room beside the tongue).
  if (roundStripBL) {
    parts.push(`H ${sr}`);
    if (sr > 0) {
      parts.push(`A ${sr} ${sr} 0 0 1 0 ${stripH - sr}`);
    }
    parts.push(`V 0`);
  } else {
    parts.push(`H 0`, `V 0`);
  }

  parts.push(`Z`);
  return `path('${parts.join(" ")}')`;
}

export function NavBar() {
  const pathname = usePathname();
  const taxonomy = useTaxonomy();
  const [open, setOpen] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  /** Geometry of the sub-list tongue painted by the same plate fill. */
  const [tongue, setTongue] = useState<{
    left: number;
    width: number;
    stripH: number;
    tongueH: number;
    plateW: number;
  } | null>(null);
  const menuId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const tongueRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

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

  const subPanelVisible = open && activeSubs.length > 0;

  useLayoutEffect(() => {
    if (!subPanelVisible || !activeCategoryId) {
      // Collapse tongue smoothly; keep last left/width for the close slide.
      setTongue((prev) => (prev ? { ...prev, tongueH: 0 } : null));
      return;
    }

    let openRaf = 0;

    const update = () => {
      const plate = plateRef.current;
      const strip = stripRef.current;
      const tongueEl = tongueRef.current;
      const tile = categoryRefs.current.get(activeCategoryId);
      if (!plate || !strip || !tongueEl || !tile) return;

      const plateBox = plate.getBoundingClientRect();
      // Center under the image square, not the whole column (label below).
      const square =
        tile.querySelector<HTMLElement>("[data-category-thumb]") ?? tile;
      const squareBox = square.getBoundingClientRect();
      const plateW = Math.round(plate.offsetWidth);
      const stripH = Math.round(strip.offsetHeight);

      // Width from content (longest subcategory label), then center under square.
      const prevWidth = tongueEl.style.width;
      tongueEl.style.width = "max-content";
      const panelWidth = Math.ceil(tongueEl.scrollWidth);
      const tongueH = Math.round(tongueEl.scrollHeight);
      tongueEl.style.width = prevWidth;

      const squareMid =
        (squareBox.left + squareBox.right) / 2 - plateBox.left;
      const left = Math.round(
        Math.max(
          0,
          Math.min(squareMid - panelWidth / 2, plateW - panelWidth),
        ),
      );

      const next = {
        left,
        width: panelWidth,
        stripH,
        tongueH,
        plateW,
      };

      setTongue((prev) => {
        // First open / re-open: start collapsed so height can ease in.
        if (!prev || prev.tongueH === 0) {
          cancelAnimationFrame(openRaf);
          openRaf = requestAnimationFrame(() => {
            openRaf = requestAnimationFrame(() => setTongue(next));
          });
          return { ...next, tongueH: 0 };
        }
        return next;
      });
    };

    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      cancelAnimationFrame(openRaf);
    };
  }, [subPanelVisible, activeCategoryId, activeSubs.length]);

  const plateClipPath = tongue
    ? menuPlateClipPath(tongue)
    : undefined;

  const fillStyle: CSSProperties = {
    backgroundColor: CATEGORY_MENU_BG,
    clipPath: plateClipPath,
    transition: "clip-path 300ms cubic-bezier(0.22, 1, 0.36, 1)",
  };

  const tongueMotion =
    "left 300ms cubic-bezier(0.22, 1, 0.36, 1), width 300ms cubic-bezier(0.22, 1, 0.36, 1), top 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease";
  const spacerMotion = "height 300ms cubic-bezier(0.22, 1, 0.36, 1)";

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
        className={`absolute inset-x-0 top-full z-10 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        {/* Clip slide-in when closed; when open allow the L-tongue to hang. */}
        <div className={open ? "overflow-visible" : "overflow-hidden"}>
          {/*
            ONE fill (#faf8f5). Sub-links have no own background — the plate
            is clip-pathed into strip + narrow tongue so a second shade is
            impossible.
          */}
          <div
            ref={plateRef}
            className={`relative transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            {/* Single cream fill (+ L-tongue). Shadow on this layer only. */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 -z-10 ${
                tongue && tongue.tongueH > 0 ? "" : "rounded-b-xl"
              }`}
              style={{
                ...fillStyle,
                filter: open
                  ? "drop-shadow(0 14px 28px rgba(45, 35, 25, 0.14))"
                  : undefined,
              }}
            />

            {menuReady ? (
              <div
                ref={stripRef}
                className="relative z-10 border-b border-black/5"
              >
                <div className="mx-auto w-[var(--content-width)] pt-4 pb-4">
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
                          ref={(node) => {
                            if (node) categoryRefs.current.set(id, node);
                            else categoryRefs.current.delete(id);
                          }}
                          className="group flex cursor-pointer flex-col items-center gap-2 text-center"
                        >
                          {/*
                            Outline on the outer shell — overflow-hidden on the
                            image itself would clip outline/ring.
                          */}
                          <div
                            data-category-thumb
                            className={`relative aspect-square w-full rounded-xl bg-[#f3efe9] transition-[box-shadow,outline-color] duration-200 ${
                              isActive
                                ? "shadow-md outline outline-2 outline-[#75825B]"
                                : "shadow-sm group-hover:shadow-md"
                            }`}
                          >
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
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
                </div>
              </div>
            ) : null}

            {/* In-flow spacer — height animates with the tongue. */}
            <div
              style={{
                height: tongue?.tongueH ?? 0,
                transition: spacerMotion,
              }}
              aria-hidden
            />

            <div
              ref={tongueRef}
              className={`absolute z-20 overflow-hidden rounded-b-xl border-x border-b border-black/5 pb-1 pt-0.5 ${
                subPanelVisible && (tongue?.tongueH ?? 0) > 0
                  ? "pointer-events-auto"
                  : "pointer-events-none"
              }`}
              style={{
                left: tongue?.left ?? 0,
                top: tongue?.stripH ?? "100%",
                width: tongue?.width ?? 240,
                opacity: subPanelVisible && (tongue?.tongueH ?? 0) > 0 ? 1 : 0,
                transition: tongueMotion,
                // border-black/5 — same hairline as under the category strip.
                borderColor: MENU_HAIRLINE,
              }}
              aria-hidden={!subPanelVisible}
              aria-label={
                activeCategoryLabel
                  ? `Subkategórie: ${activeCategoryLabel}`
                  : "Subkategórie"
              }
            >
              <ul
                key={activeCategoryId ?? "none"}
                className="flex flex-col gap-0.5 px-1 [animation:nav-sub-fade_220ms_ease]"
              >
                {activeSubs.map((sub) => (
                  <li key={sub.id}>
                    <Link
                      href={buildCategoryFilterHref(activeCategoryId ?? "", {
                        sub: sub.id,
                      })}
                      prefetch={false}
                      onClick={closeMenu}
                      className="block cursor-pointer whitespace-nowrap px-3 py-2 font-heading text-[0.95rem] leading-snug text-[#2f2924] transition-colors duration-150 hover:text-[#75825B]"
                    >
                      {sub.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
