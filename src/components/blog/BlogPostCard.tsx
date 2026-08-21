import Image from "next/image";
import Link from "next/link";
import { formatBlogDate, type BlogPost } from "@/lib/blog";

type BlogPostCardProps = {
  post: BlogPost;
};

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <article className="group grid grid-cols-[7rem_1fr] gap-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
      <Link
        href={`/blog/${post.slug}`}
        className="relative block aspect-square overflow-hidden rounded-xl bg-[#f3efe9]"
      >
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="144px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#2f2924]/55">
          <span className="font-medium tracking-[0.12em] text-[#75825B] uppercase">
            {post.category}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
        </div>

        <h2 className="mt-1 text-base leading-snug text-[#2f2924] sm:text-lg">
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors hover:text-[#75825B]"
          >
            {post.title}
          </Link>
        </h2>

        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#2f2924]/65">
          {post.excerpt}
        </p>
      </div>
    </article>
  );
}
