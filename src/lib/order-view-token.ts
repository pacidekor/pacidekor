import { createHmac, timingSafeEqual } from "crypto";
import { normalizeOrderNumberInput } from "@/lib/orders";
import { absoluteUrl } from "@/lib/seo";

function getOrderViewSecret() {
  const dedicated = process.env.ORDER_VIEW_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error("Chýba ORDER_VIEW_SECRET (alebo SUPABASE_SERVICE_ROLE_KEY).");
}

export function createOrderViewToken(orderNumber: string) {
  const normalized = normalizeOrderNumberInput(orderNumber);
  return createHmac("sha256", getOrderViewSecret())
    .update(normalized)
    .digest("base64url");
}

export function verifyOrderViewToken(orderNumber: string, token: string) {
  if (!token?.trim()) return false;
  try {
    const expected = createOrderViewToken(orderNumber);
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(token.trim());
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

/** Absolute URL for e-mail CTAs: /objednavka/PD-…?t=TOKEN */
export function buildOrderViewUrl(orderNumber: string, siteUrl?: string) {
  const normalized = normalizeOrderNumberInput(orderNumber);
  const token = createOrderViewToken(normalized);
  const path = `/objednavka/${encodeURIComponent(normalized)}?t=${encodeURIComponent(token)}`;
  if (siteUrl) {
    const base = siteUrl.replace(/\/$/, "");
    return `${base}${path}`;
  }
  return absoluteUrl(path);
}
