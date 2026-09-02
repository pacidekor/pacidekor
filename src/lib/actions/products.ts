"use server";

import type {
  ProductActionResult,
  ProductUpsertInput,
} from "@/lib/product-action-types";
import {
  deleteProductAdmin,
  upsertProductAdmin,
} from "@/lib/products-admin-server";
import type { Product } from "@/lib/products";

export async function upsertProductAction(
  input: ProductUpsertInput,
): Promise<ProductActionResult<Product>> {
  return upsertProductAdmin(input);
}

export async function deleteProductAction(
  productId: string,
): Promise<ProductActionResult> {
  return deleteProductAdmin(productId);
}
