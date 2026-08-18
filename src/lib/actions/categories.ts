"use server";

import { revalidatePath } from "next/cache";
import { listTaxonomy, type TaxonomyStore } from "@/lib/categories-server";
import type {
  CategoryInsert,
  DruhInsert,
  SubcategoryInsert,
} from "@/lib/supabase/database.types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type CategoryActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CategorySaveInput = {
  id?: string;
  label: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  subs: { id?: string; label: string }[];
  druhy: { id?: string; label: string }[];
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Nie ste prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Nemáte oprávnenie administrátora." };
  }

  return { ok: true as const, user };
}

function revalidateCategoryPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/produkty");
  revalidatePath("/novinky");
  revalidatePath("/akcia");
  revalidatePath("/kategorie", "layout");
  revalidatePath("/admin/kategorie");
  revalidatePath("/admin/produkty");
  revalidatePath("/admin", "layout");
}

function toSlugId(label: string) {
  return (
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "polozka"
  );
}

async function uniqueCategoryId(
  db: ReturnType<typeof createServiceClient>,
  label: string,
) {
  const base = toSlugId(label);
  let id = base;
  let suffix = 2;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const { data } = await db.from("categories").select("id").eq("id", id).maybeSingle();
    if (!data) return id;
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now()}`;
}

async function uniqueSubcategoryId(
  db: ReturnType<typeof createServiceClient>,
  label: string,
  reserved: Set<string>,
) {
  const base = toSlugId(label);
  let id = base;
  let suffix = 2;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (!reserved.has(id)) {
      const { data } = await db
        .from("subcategories")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (!data) return id;
    }
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now()}`;
}

async function uniqueDruhId(
  db: ReturnType<typeof createServiceClient>,
  label: string,
  reserved: Set<string>,
) {
  const base = toSlugId(label);
  let id = base;
  let suffix = 2;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (!reserved.has(id)) {
      const { data } = await db
        .from("druhy")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (!data) return id;
    }
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now()}`;
}

function sanitizeImage(image?: string) {
  const value = image?.trim();
  if (!value) return null;
  if (value.startsWith("data:")) {
    throw new Error(
      "Obrázok sa nepodarilo skomprimovať. Skúste ho nahrať znova.",
    );
  }
  return value;
}

export async function listTaxonomyAction(): Promise<
  CategoryActionResult<TaxonomyStore>
> {
  try {
    return { ok: true, data: await listTaxonomy() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Načítanie zlyhalo.",
    };
  }
}

export async function saveCategoryAction(
  input: CategorySaveInput,
): Promise<CategoryActionResult<TaxonomyStore>> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { ok: false, error: auth.error };

    const label = input.label.trim();
    if (!label) return { ok: false, error: "Zadajte názov kategórie." };

    const db = createServiceClient();
    const isCreate = !input.id;
    const categoryId = isCreate
      ? await uniqueCategoryId(db, label)
      : input.id!;

    const categoryPayload: CategoryInsert = {
      id: categoryId,
      label,
      image: sanitizeImage(input.image),
      description: input.description?.trim() || null,
      sort_order: input.sortOrder ?? 0,
    };

    if (isCreate) {
      const { error } = await db.from("categories").insert(categoryPayload);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data: existingCategory, error: existingCategoryError } = await db
        .from("categories")
        .select("label")
        .eq("id", categoryId)
        .maybeSingle();

      if (existingCategoryError) {
        return { ok: false, error: existingCategoryError.message };
      }

      const previousLabel = (
        existingCategory as { label: string } | null
      )?.label;

      const { error } = await db
        .from("categories")
        .update({
          label: categoryPayload.label,
          image: categoryPayload.image,
          description: categoryPayload.description,
        })
        .eq("id", categoryId);
      if (error) return { ok: false, error: error.message };

      // Products store category as display label — keep them in sync on rename.
      if (previousLabel && previousLabel !== label) {
        const { error: productsError } = await db
          .from("products")
          .update({ category: label })
          .eq("category", previousLabel);
        if (productsError) return { ok: false, error: productsError.message };
      }
    }

    const { data: existingSubs, error: existingError } = await db
      .from("subcategories")
      .select("id")
      .eq("category_id", categoryId);

    if (existingError) return { ok: false, error: existingError.message };

    const existingIds = new Set(
      ((existingSubs as { id: string }[] | null) ?? []).map((row) => row.id),
    );

    const keptIds = new Set(
      input.subs.map((sub) => sub.id).filter((id): id is string => Boolean(id)),
    );

    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (toDelete.length > 0) {
      const { error } = await db.from("subcategories").delete().in("id", toDelete);
      if (error) return { ok: false, error: error.message };
    }

    const reserved = new Set<string>();
    const upserts: SubcategoryInsert[] = [];
    let sortOrder = 0;

    for (const sub of input.subs) {
      const subLabel = sub.label.trim();
      if (!subLabel) continue;

      let subId = sub.id;
      if (!subId || !existingIds.has(subId)) {
        subId = await uniqueSubcategoryId(db, subLabel, reserved);
      }
      reserved.add(subId);
      upserts.push({
        id: subId,
        category_id: categoryId,
        label: subLabel,
        sort_order: sortOrder,
      });
      sortOrder += 1;
    }

    if (upserts.length > 0) {
      const { error } = await db
        .from("subcategories")
        .upsert(upserts, { onConflict: "id" });
      if (error) return { ok: false, error: error.message };
    }

    const { data: existingDruhy, error: existingDruhyError } = await db
      .from("druhy")
      .select("id")
      .eq("category_id", categoryId);

    if (existingDruhyError) {
      return { ok: false, error: existingDruhyError.message };
    }

    const existingDruhIds = new Set(
      ((existingDruhy as { id: string }[] | null) ?? []).map((row) => row.id),
    );

    const keptDruhIds = new Set(
      (input.druhy ?? [])
        .map((druh) => druh.id)
        .filter((id): id is string => Boolean(id)),
    );

    const druhyToDelete = [...existingDruhIds].filter(
      (id) => !keptDruhIds.has(id),
    );
    if (druhyToDelete.length > 0) {
      const { error } = await db.from("druhy").delete().in("id", druhyToDelete);
      if (error) return { ok: false, error: error.message };
    }

    const druhReserved = new Set<string>();
    const druhUpserts: DruhInsert[] = [];
    let druhSortOrder = 0;

    for (const druh of input.druhy ?? []) {
      const druhLabel = druh.label.trim();
      if (!druhLabel) continue;

      let druhId = druh.id;
      if (!druhId || !existingDruhIds.has(druhId)) {
        druhId = await uniqueDruhId(db, druhLabel, druhReserved);
      }
      druhReserved.add(druhId);
      druhUpserts.push({
        id: druhId,
        category_id: categoryId,
        label: druhLabel,
        sort_order: druhSortOrder,
      });
      druhSortOrder += 1;
    }

    if (druhUpserts.length > 0) {
      const { error } = await db
        .from("druhy")
        .upsert(druhUpserts, { onConflict: "id" });
      if (error) return { ok: false, error: error.message };
    }

    if (isCreate) {
      const taxonomy = await listTaxonomy();
      const maxSort = taxonomy.categories.reduce(
        (max, item) => Math.max(max, item.sortOrder),
        -1,
      );
      await db
        .from("categories")
        .update({ sort_order: maxSort + 1 })
        .eq("id", categoryId);
    }

    revalidateCategoryPaths();
    return { ok: true, data: await listTaxonomy() };
  } catch (error) {
    console.error("saveCategoryAction", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Uloženie kategórie zlyhalo.",
    };
  }
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<CategoryActionResult<TaxonomyStore>> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { ok: false, error: auth.error };

    const db = createServiceClient();
    const { error } = await db.from("categories").delete().eq("id", categoryId);

    if (error) return { ok: false, error: error.message };

    revalidateCategoryPaths();
    return { ok: true, data: await listTaxonomy() };
  } catch (error) {
    console.error("deleteCategoryAction", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Odstránenie kategórie zlyhalo.",
    };
  }
}
