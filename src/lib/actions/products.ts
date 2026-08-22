"use server";

import { revalidatePath } from "next/cache";
import {
  type ProductActionResult,
  type ProductUpsertInput,
} from "@/lib/product-action-types";
import { upsertProductAdmin } from "@/lib/products-admin-server";
import type { Product } from "@/lib/products";
import { createAdminClient, createServiceClient } from "@/lib/supabase/server";

export type { ProductActionResult, ProductUpsertInput };

export async function upsertProductAction(
  input: ProductUpsertInput,
): Promise<ProductActionResult<Product>> {
  return upsertProductAdmin(input);
}

export async function deleteProductAction(
  productId: string,
): Promise<ProductActionResult> {
  try {
    const supabase = await createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Nie ste prihlásený." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return { ok: false, error: "Nemáte oprávnenie administrátora." };
    }

    const { data: existing } = await supabase
      .from("products")
      .select("slug, images")
      .eq("id", productId)
      .maybeSingle();

    const db = createServiceClient();
    const { error } = await db.from("products").delete().eq("id", productId);

    if (error) {
      return { ok: false, error: error.message };
    }

    const images = (existing?.images as string[] | null) ?? [];
    const paths = images
      .map((url) => storagePathFromPublicUrl(url))
      .filter((path): path is string => Boolean(path));

    if (paths.length > 0) {
      await db.storage.from("product-images").remove(paths);
    }

    try {
      revalidatePath("/");
      revalidatePath("/produkty");
      revalidatePath("/novinky");
      revalidatePath("/akcia");
      revalidatePath("/vypredaj");
      revalidatePath("/admin");
      revalidatePath("/admin/produkty");
      revalidatePath("/kategorie", "layout");
      if (existing?.slug) {
        revalidatePath(`/produkt/${existing.slug}`);
      }
    } catch (revalidateError) {
      console.error("deleteProductAction revalidate", revalidateError);
    }

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("deleteProductAction", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Vymazanie produktu zlyhalo. Skúste to znova.",
    };
  }
}

function storagePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}
