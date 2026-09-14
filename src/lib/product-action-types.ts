import type { Product } from "@/lib/products";
import type { ProductAttributes } from "@/lib/taxonomy";

export type ProductActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ProductUpsertInput = {
  id?: string;
  name: string;
  description: string;
  sku?: string;
  price?: string;
  originalPrice?: string;
  discount?: number;
  category: string;
  subcategoryId?: string;
  druhId?: string;
  attributes?: ProductAttributes;
  images: string[];
  colorImageMap?: Record<string, number[]>;
  inStock: boolean;
  stockQuantity?: number | null;
  details?: Product["details"];
  markAsNew?: boolean;
  inVypredaj?: boolean;
  isBestseller?: boolean;
};
