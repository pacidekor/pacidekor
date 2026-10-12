"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearListingScrollForPath,
  hasListingScrollForPath,
} from "@/lib/listing-scroll";

const POP_FLAG = "pacidekor.listing.pop";

/**
 * Scroll to top on normal navigations.
 * On browser Back into a listing with a restore snapshot, leave scroll alone
 * (CategoryProductBrowser / ProductCollectionBrowser restore it).
 * On browser Forward into a PDP (or any page without a listing snapshot),
 * still reset to top — otherwise the tall listing scrollY sticks and the
 * short PDP clamps to the bottom.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    function onPopState() {
      try {
        sessionStorage.setItem(POP_FLAG, "1");
      } catch {
        // ignore
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    let wasPop = false;
    try {
      wasPop = sessionStorage.getItem(POP_FLAG) === "1";
    } catch {
      wasPop = false;
    }

    if (wasPop) {
      // Keep the flag briefly so React Strict Mode remount still sees Back.
      const id = window.setTimeout(() => {
        try {
          sessionStorage.removeItem(POP_FLAG);
        } catch {
          // ignore
        }
      }, 500);

      // Back → listing with snapshot: browser/listing restore handles scroll.
      // Forward → PDP (no listing snapshot): must reset or we stay at the
      // previous category scrollY and land at the bottom of the short page.
      if (!hasListingScrollForPath(pathname)) {
        window.scrollTo(0, 0);
      }

      return () => window.clearTimeout(id);
    }

    // Fresh open of a listing — drop a stale “return to product” snapshot.
    if (hasListingScrollForPath(pathname)) {
      clearListingScrollForPath(pathname);
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
