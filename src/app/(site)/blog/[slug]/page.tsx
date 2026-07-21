import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  blogPosts,
  formatBlogDate,
  getPostBySlug,
  getRelatedPosts,
  type BlogBlock,
  type BlogPost,
} from "@/lib/blog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: "Článok nenájdený" };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

function BlogContent({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2 key={index} className="pt-2 text-lg text-[#2f2924] sm:text-xl">
              {block.text}
            </h2>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={index}
              className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#2f2924]/75 sm:text-base"
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={index}
            className="text-sm leading-relaxed text-[#2f2924]/75 sm:text-base sm:leading-7"
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function RelatedPostLink({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group grid grid-cols-[4.5rem_1fr] gap-3"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f3efe9]">
        <Image
          src={post.coverImage}
          alt=""
          fill
          sizes="72px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <span className="text-[11px] font-medium tracking-[0.12em] text-[#75825B] uppercase">
          {post.category}
        </span>
        <span className="mt-0.5 text-sm leading-snug text-[#2f2924] transition-colors group-hover:text-[#75825B]">
          {post.title}
        </span>
      </div>
    </Link>
  );
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const related = getRelatedPosts(post.slug);

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 flex min-w-0 items-center gap-2 text-sm text-[#2f2924]/55">
        <Link href="/" className="shrink-0 transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="shrink-0" aria-hidden>
          /
        </span>
        <Link
          href="/blog"
          className="shrink-0 transition-colors hover:text-[#75825B]"
        >
          Blog
        </Link>
        <span className="shrink-0" aria-hidden>
          /
        </span>
        <span className="min-w-0 truncate text-[#2f2924]">{post.title}</span>
      </nav>

      <article>
        <header>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#2f2924]/55">
            <span className="font-medium tracking-[0.12em] text-[#75825B] uppercase">
              {post.category}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={post.publishedAt}>
              {formatBlogDate(post.publishedAt)}
            </time>
          </div>

          <h1 className="mt-3 text-2xl leading-snug text-[#2f2924] sm:text-3xl">
            {post.title}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
            {post.excerpt}
          </p>
        </header>

        <div className="mt-8">
          <BlogContent blocks={post.content} />
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#2f2924]/10 pt-6">
          <p className="text-sm text-[#2f2924]/55">{post.author}</p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2f2924] transition-colors hover:text-[#75825B]"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden />
            Všetky články
          </Link>
        </div>
      </article>

      {related.length > 0 ? (
        <section
          className="mt-12 border-t border-[#2f2924]/10 pt-8"
          aria-labelledby="related-posts-heading"
        >
          <h2 id="related-posts-heading" className="mb-5 text-xl text-[#2f2924]">
            Ďalšie čítanie
          </h2>
          <div className="flex flex-col gap-5">
            {related.map((relatedPost) => (
              <RelatedPostLink key={relatedPost.slug} post={relatedPost} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
