import type { Product } from "@/lib/products";
import type { ProductAttributes } from "@/lib/taxonomy";
import type { TextVariant, VariantMode } from "@/lib/product-variants";

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
  /** Color IDs blocked for purchase; must be subset of attributes.colors. */
  unavailableColorIds?: string[];
  inStock: boolean;
  stockQuantity?: number | null;
  details?: Product["details"];
  markAsNew?: boolean;
  inVypredaj?: boolean;
  isBestseller?: boolean;
  variantMode?: VariantMode;
  variantAxisLabel?: string | null;
  textVariants?: TextVariant[];
  defaultVariantId?: string | null;
  /** When leaving custom: explicit catalog price for the new mode. */
  priceAfterModeSwitch?: string | null;
};
