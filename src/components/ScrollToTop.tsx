"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearListingScrollForPath,
  hasListingScrollForPath,
} from "@/lib/listing-scroll";

const POP_FLAG = "pacidekor.listing.pop";

/**
 * Scroll to top on forward navigations.
 * On browser Back/Forward, leave listing restore snapshots alone.
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

  useEffect(() => {
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
