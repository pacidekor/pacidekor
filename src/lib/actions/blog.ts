"use server";

import { revalidatePath } from "next/cache";
import { listBlogPosts } from "@/lib/blog-server";
import type { BlogBlock, BlogCategory, BlogPost, BlogPostWithId } from "@/lib/blog";
import type { BlogPostInsert } from "@/lib/supabase/database.types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type BlogActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type BlogSaveInput = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: BlogCategory;
  author: string;
  publishedAt: string;
  content: BlogBlock[];
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Nie ste prihlásený." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Nemáte oprávnenie administrátora." };
  }

  return { ok: true as const };
}

function revalidateBlogPaths(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
}

export async function listBlogPostsAction(): Promise<
  BlogActionResult<BlogPostWithId[]>
> {
  try {
    return { ok: true, data: await listBlogPosts() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Načítanie zlyhalo.",
    };
  }
}

export async function saveBlogPostAction(
  input: BlogSaveInput,
): Promise<BlogActionResult<BlogPostWithId[]>> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { ok: false, error: auth.error };

    const slug = input.slug.trim();
    const title = input.title.trim();
    if (!slug || !title) {
      return { ok: false, error: "Zadajte názov a slug článku." };
    }

    const db = createServiceClient();
    const payload: BlogPostInsert = {
      slug,
      title,
      excerpt: input.excerpt.trim(),
      cover_image: input.coverImage.trim(),
      category: input.category,
      author: input.author.trim() || "PACIDEKOR",
      published_at:
        input.publishedAt.trim() || new Date().toISOString().slice(0, 10),
      content: input.content,
    };

    if (input.id) {
      const { id: _id, ...updatePayload } = payload;
      void _id;
      const { error } = await db
        .from("blog_posts")
        .update(updatePayload)
        .eq("id", input.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const existing = await listBlogPosts();
      const { error } = await db.from("blog_posts").insert({
        ...payload,
        sort_order: existing.length,
      });
      if (error) return { ok: false, error: error.message };
    }

    revalidateBlogPaths(slug);
    return { ok: true, data: await listBlogPosts() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Uloženie zlyhalo.",
    };
  }
}

export async function deleteBlogPostAction(
  id: string,
): Promise<BlogActionResult<BlogPostWithId[]>> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { ok: false, error: auth.error };

    const db = createServiceClient();
    const { data: existing } = await db
      .from("blog_posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await db.from("blog_posts").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidateBlogPaths(
      existing && typeof existing.slug === "string" ? existing.slug : undefined,
    );
    return { ok: true, data: await listBlogPosts() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Odstránenie zlyhalo.",
    };
  }
}

export type { BlogPost };
