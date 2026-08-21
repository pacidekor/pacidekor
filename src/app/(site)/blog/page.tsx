import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostsList } from "@/components/blog/BlogPostsList";
import { listBlogPosts } from "@/lib/blog-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description:
    "Inšpirácie, tipy a novinky zo sveta umelých kvetov, dekorácií a aranžmánov od PACIDEKOR.",
  path: "/blog",
});

export default async function BlogPage() {
  const posts = await listBlogPosts();

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Blog</span>
      </nav>

      <header className="mb-8 max-w-xl">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">Blog</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
          Inšpirácie a tipy zo sveta kvetov a dekorácií.
        </p>
      </header>

      <BlogPostsList posts={posts} />
    </main>
  );
}
