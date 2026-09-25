"use client";

import type {
  ProductActionResult,
} from "@/lib/product-action-types";
import type { Product } from "@/lib/products";

export async function fetchAdminProduct(
  productId: string,
): Promise<ProductActionResult<Product>> {
  try {
    const response = await fetch(
      `/api/admin/products/${encodeURIComponent(productId)}`,
      { credentials: "include", cache: "no-store" },
    );

    let payload: ProductActionResult<Product> | null = null;
    try {
      payload = (await response.json()) as ProductActionResult<Product>;
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
            ? "Produkt sa nenašiel."
            : `Načítanie zlyhalo (HTTP ${response.status}).`,
    };
  } catch (error) {
    console.error("fetchAdminProduct", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Načítanie produktu zlyhalo.",
    };
  }
}
