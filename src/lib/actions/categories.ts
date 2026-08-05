"use server";

import { revalidatePath } from "next/cache";
import {
  listTaxonomy,
  mapCategoryRow,
  mapSubcategoryRow,
  type TaxonomyStore,
} from "@/lib/categories-server";
import type {
  CategoryInsert,
  CategoryRow,
  SubcategoryInsert,
  SubcategoryRow,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

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
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Nie ste prihlásený.", supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      ok: false as const,
      error: "Nemáte oprávnenie administrátora.",
      supabase,
    };
  }

  return { ok: true as const, supabase, user };
}

function revalidateCategoryPaths() {
  revalidatePath("/");
  revalidatePath("/produkty");
  revalidatePath("/kategorie", "layout");
  revalidatePath("/admin/kategorie");
  revalidatePath("/admin/produkty");
}

function toSlugId(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "polozka";
}

async function uniqueCategoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  label: string,
  excludeId?: string,
) {
  const base = toSlugId(label);
  let id = base;
  let suffix = 2;
  for (;;) {
    let query = supabase.from("categories").select("id").eq("id", id);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return id;
    id = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function uniqueSubcategoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  label: string,
  reserved: string[],
) {
  const base = toSlugId(label);
  let id = base;
  let suffix = 2;
  for (;;) {
    if (!reserved.includes(id)) {
      const { data } = await supabase
        .from("subcategories")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (!data) return id;
    }
    id = `${base}-${suffix}`;
    suffix += 1;
  }
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
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const label = input.label.trim();
  if (!label) return { ok: false, error: "Zadajte názov kategórie." };

  const isCreate = !input.id;
  const categoryId = isCreate
    ? await uniqueCategoryId(auth.supabase, label)
    : input.id!;

  const categoryPayload: CategoryInsert = {
    id: categoryId,
    label,
    image: input.image?.trim() || null,
    description: input.description?.trim() || null,
    sort_order: input.sortOrder ?? 0,
  };

  if (isCreate) {
    const { error } = await auth.supabase
      .from("categories")
      .insert(categoryPayload);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await auth.supabase
      .from("categories")
      .update({
        label: categoryPayload.label,
        image: categoryPayload.image,
        description: categoryPayload.description,
      })
      .eq("id", categoryId);
    if (error) return { ok: false, error: error.message };
  }

  const { data: existingSubs } = await auth.supabase
    .from("subcategories")
    .select("id")
    .eq("category_id", categoryId);

  const existingIds = new Set(
    ((existingSubs as { id: string }[] | null) ?? []).map((row) => row.id),
  );

  const keptIds = new Set(
    input.subs.map((sub) => sub.id).filter((id): id is string => Boolean(id)),
  );

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await auth.supabase
      .from("subcategories")
      .delete()
      .in("id", toDelete);
    if (error) return { ok: false, error: error.message };
  }

  const reserved: string[] = [];
  const upserts: SubcategoryInsert[] = [];
  let sortOrder = 0;

  for (const sub of input.subs) {
    const subLabel = sub.label.trim();
    if (!subLabel) continue;

    let subId = sub.id;
    if (!subId || !existingIds.has(subId)) {
      subId = await uniqueSubcategoryId(auth.supabase, subLabel, reserved);
    }
    reserved.push(subId);
    upserts.push({
      id: subId,
      category_id: categoryId,
      label: subLabel,
      sort_order: sortOrder,
    });
    sortOrder += 1;
  }

  if (upserts.length > 0) {
    const { error } = await auth.supabase
      .from("subcategories")
      .upsert(upserts, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };
  }

  // Keep create sort_order at end of list
  if (isCreate) {
    const taxonomy = await listTaxonomy();
    const maxSort = taxonomy.categories.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      -1,
    );
    await auth.supabase
      .from("categories")
      .update({ sort_order: maxSort + 1 })
      .eq("id", categoryId);
  }

  revalidateCategoryPaths();
  return { ok: true, data: await listTaxonomy() };
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<CategoryActionResult<TaxonomyStore>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) return { ok: false, error: error.message };

  revalidateCategoryPaths();
  return { ok: true, data: await listTaxonomy() };
}

/** Helper exports for typing consumers that map rows client-side. */
export type { CategoryRow, SubcategoryRow };
export { mapCategoryRow, mapSubcategoryRow };
