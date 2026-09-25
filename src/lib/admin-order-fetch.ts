"use client";

import type { Order } from "@/lib/orders";

type OrderResult =
  | { ok: true; data: Order }
  | { ok: false; error: string };

export async function fetchAdminOrder(
  orderNumber: string,
): Promise<OrderResult> {
  try {
    const response = await fetch(
      `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
      { credentials: "include", cache: "no-store" },
    );

    let payload: OrderResult | null = null;
    try {
      payload = (await response.json()) as OrderResult;
    } catch {
      payload = null;
    }

    if (payload && typeof payload === "object" && "ok" in payload) {
      return payload;
    }

    return {
      ok: false,
      error:
        response.status === 401
          ? "Nie ste prihlásený."
          : response.status === 404
            ? "Objednávka sa nenašla."
            : `Načítanie zlyhalo (HTTP ${response.status}).`,
    };
  } catch (error) {
    console.error("fetchAdminOrder", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Načítanie objednávky zlyhalo.",
    };
  }
}
