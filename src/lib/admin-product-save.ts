"use client";

import type {
  ProductActionResult,
  ProductUpsertInput,
} from "@/lib/product-action-types";
import type { Product } from "@/lib/products";

export async function saveAdminProduct(
  input: ProductUpsertInput,
): Promise<ProductActionResult<Product>> {
  try {
    const response = await fetch("/api/admin/products/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });

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
          : response.status === 403
            ? "Nemáte oprávnenie administrátora."
            : `Uloženie zlyhalo (HTTP ${response.status}). Skúste to znova.`,
    };
  } catch (error) {
    console.error("saveAdminProduct", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Uloženie produktu zlyhalo. Skúste to znova.",
    };
  }
}
