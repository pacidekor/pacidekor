"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  listingScrollKey,
  peekListingScroll,
  saveListingScroll,
  takeListingScroll,
} from "@/lib/listing-scroll";
import type { Product } from "@/lib/products";

const PAGE_SIZE = 24;

export type CatalogPagedListState = {
  products: Product[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  loadError: string | null;
  rootRef: React.RefObject<HTMLDivElement | null>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  loadMore: () => Promise<void>;
  pageSize: number;
};

/**
 * Shared infinite catalog paging — same contract as /produkty.
 * `filtersKey` must change when URL filters change (resets via initial*).
 */
export function useCatalogPagedList(options: {
  initialProducts: Product[];
  initialTotal: number;
  initialHasMore: boolean;
  filtersKey: string;
  /** Extra query params for /api/products/list (excluding offset/limit). */
  buildFilterParams: () => URLSearchParams;
}): CatalogPagedListState {
  const pathname = usePathname();
  const {
    initialProducts,
    initialTotal,
    initialHasMore,
    filtersKey,
    buildFilterParams,
  } = options;

  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const didReadRestoreRef = useRef(false);
  const pendingScrollYRef = useRef<number | null>(null);
  const pendingProductIdRef = useRef<string | null>(null);
  const pendingVisibleCountRef = useRef<number | null>(null);
  const visibleCountRef = useRef(initialProducts.length);
  const filtersKeySnapshotRef = useRef(filtersKey);
  const buildFilterParamsRef = useRef(buildFilterParams);
  buildFilterParamsRef.current = buildFilterParams;

  visibleCountRef.current = products.length;

  useEffect(() => {
    setProducts(initialProducts);
    setTotal(initialTotal);
    setHasMore(initialHasMore);
    setLoadError(null);
    filtersKeySnapshotRef.current = filtersKey;
  }, [filtersKey, initialProducts, initialTotal, initialHasMore]);

  useLayoutEffect(() => {
    if (didReadRestoreRef.current) return;
    didReadRestoreRef.current = true;
    const key = listingScrollKey(pathname, filtersKeySnapshotRef.current);
    const saved = peekListingScroll(key);
    if (!saved) return;
    pendingScrollYRef.current = saved.scrollY;
    pendingProductIdRef.current = saved.productId ?? null;
    pendingVisibleCountRef.current = Math.max(
      PAGE_SIZE,
      typeof saved.visibleCount === "number" ? saved.visibleCount : PAGE_SIZE,
    );
  }, [pathname]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const params = buildFilterParamsRef.current();
      params.set("offset", String(products.length));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/products/list?${params.toString()}`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        products: Product[];
        total: number;
        hasMore: boolean;
      };
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = [...prev];
        for (const product of data.products) {
          if (seen.has(product.id)) continue;
          seen.add(product.id);
          next.push(product);
        }
        return next;
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      setLoadError("Ďalšie produkty sa nepodarilo načítať.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const needed = pendingVisibleCountRef.current;
    if (needed == null || needed <= products.length || !hasMore || loadingMore) {
      return;
    }
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore-driven
  }, [products.length, hasMore, loadingMore]);

  useLayoutEffect(() => {
    if (pendingScrollYRef.current == null && !pendingProductIdRef.current) {
      return;
    }
    const needed = pendingVisibleCountRef.current ?? PAGE_SIZE;
    if (products.length < needed && hasMore) return;

    const key = listingScrollKey(pathname, filtersKeySnapshotRef.current);

    function applyRestore() {
      const productId = pendingProductIdRef.current;
      if (productId) {
        const el = document.querySelector(
          `[data-product-id="${CSS.escape(productId)}"]`,
        );
        if (el) {
          el.scrollIntoView({ block: "center" });
          pendingScrollYRef.current = null;
          pendingProductIdRef.current = null;
          pendingVisibleCountRef.current = null;
          takeListingScroll(key);
          return true;
        }
      }
      const y = pendingScrollYRef.current;
      if (y == null) return true;
      window.scrollTo(0, y);
      const tallEnough =
        document.documentElement.scrollHeight >= y + window.innerHeight * 0.5;
      if (!tallEnough) return false;
      pendingScrollYRef.current = null;
      pendingProductIdRef.current = null;
      pendingVisibleCountRef.current = null;
      takeListingScroll(key);
      return true;
    }

    let tries = 0;
    const run = () => {
      if (applyRestore()) return;
      tries += 1;
      if (tries < 30) window.setTimeout(run, 50);
      else {
        pendingScrollYRef.current = null;
        pendingProductIdRef.current = null;
        pendingVisibleCountRef.current = null;
        takeListingScroll(key);
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [pathname, products.length, hasMore]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !rootRef.current?.contains(anchor)) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.includes("/produkt/")) return;

      const productId =
        anchor.closest("[data-product-id]")?.getAttribute("data-product-id") ??
        undefined;

      saveListingScroll(
        listingScrollKey(pathname, filtersKeySnapshotRef.current),
        {
          scrollY: window.scrollY,
          visibleCount: visibleCountRef.current,
          productId: productId ?? undefined,
          productHref: href,
        },
      );
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, products.length, filtersKey]);

  return {
    products,
    total,
    hasMore,
    loadingMore,
    loadError,
    rootRef,
    loadMoreRef,
    loadMore,
    pageSize: PAGE_SIZE,
  };
}
