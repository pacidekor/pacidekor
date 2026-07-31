"use client";

import type { ProductDiscount } from "@/lib/discounts";

export const DISCOUNTS_EVENT = "pacidekor:discounts-changed";

let discountsCache: ProductDiscount[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DISCOUNTS_EVENT));
  }
}

export function getDiscountsSnapshot() {
  return discountsCache;
}

export function setDiscountsSnapshot(next: ProductDiscount[]) {
  discountsCache = next;
  emit();
}

export function subscribeDiscounts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
