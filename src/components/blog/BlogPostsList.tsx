"use client";

import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { getManagedBlogPosts } from "@/lib/site-content";
import { useSiteContent } from "@/lib/use-site-content";

export function BlogPostsList() {
  const content = useSiteContent();
  const posts = getManagedBlogPosts(content);

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#2f2924]/12 bg-white/50 px-6 py-16 text-center">
        <p className="text-sm font-medium text-[#2f2924]">
          Zatiaľ žiadne články
        </p>
        <p className="mt-1 text-sm text-[#2f2924]/50">
          Nové príspevky sa tu zobrazia automaticky.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => (
        <BlogPostCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
