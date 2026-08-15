import type { ActionResult } from "@/lib/customers";

export type AppliedPromo = {
  code: string;
  discountPercent: number;
};

export const PROMO_STORAGE_KEY = "pacidekor.cart.promo";
export const PROMO_EVENT = "pacidekor:promo-changed";

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function promoDiscountAmount(subtotal: number, percent: number) {
  if (subtotal <= 0 || percent <= 0) return 0;
  return Math.round(((subtotal * percent) / 100) * 100) / 100;
}

export function readAppliedPromo(): AppliedPromo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppliedPromo;
    if (
      !parsed ||
      typeof parsed.code !== "string" ||
      typeof parsed.discountPercent !== "number"
    ) {
      return null;
    }
    return {
      code: normalizePromoCode(parsed.code),
      discountPercent: Math.min(100, Math.max(1, Math.round(parsed.discountPercent))),
    };
  } catch {
    return null;
  }
}

export function writeAppliedPromo(promo: AppliedPromo | null) {
  if (typeof window === "undefined") return;
  if (!promo) localStorage.removeItem(PROMO_STORAGE_KEY);
  else {
    localStorage.setItem(
      PROMO_STORAGE_KEY,
      JSON.stringify({
        code: normalizePromoCode(promo.code),
        discountPercent: promo.discountPercent,
      }),
    );
  }
  window.dispatchEvent(new Event(PROMO_EVENT));
}

export function clearAppliedPromo() {
  writeAppliedPromo(null);
}

export type ValidatePromoResult = ActionResult<{
  code: string;
  discountPercent: number;
}>;
