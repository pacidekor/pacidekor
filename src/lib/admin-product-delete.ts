"use client";

import type { ProductActionResult } from "@/lib/product-action-types";

export async function deleteAdminProduct(
  productId: string,
): Promise<ProductActionResult> {
  try {
    const response = await fetch("/api/admin/products/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId }),
    });

    let payload: ProductActionResult | null = null;
    try {
      payload = (await response.json()) as ProductActionResult;
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
          : response.status === 403
            ? "Nemáte oprávnenie administrátora."
            : `Vymazanie zlyhalo (HTTP ${response.status}). Skúste to znova.`,
    };
  } catch (error) {
    console.error("deleteAdminProduct", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Vymazanie produktu zlyhalo. Skúste to znova.",
    };
  }
}
