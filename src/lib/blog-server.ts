import "server-only";

import type { BlogBlock, BlogCategory, BlogPost, BlogPostWithId } from "@/lib/blog";
import type { BlogPostRow } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/server";

export type BlogPostMapped = BlogPostWithId;

export function mapBlogPostRow(row: BlogPostRow): BlogPostMapped {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    category: row.category as BlogCategory,
    author: row.author,
    publishedAt: row.published_at,
    content: (row.content ?? []) as BlogBlock[],
  };
}

export async function listBlogPosts(): Promise<BlogPostMapped[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("listBlogPosts", error.message);
    return [];
  }

  return ((data as BlogPostRow[] | null) ?? []).map(mapBlogPostRow);
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<BlogPostMapped | undefined> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getBlogPostBySlug", error.message);
    return undefined;
  }

  return data ? mapBlogPostRow(data as BlogPostRow) : undefined;
}
