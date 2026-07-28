import type { Metadata } from "next";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { blogPosts, getPostBySlug } from "@/lib/blog";

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
    return { title: "Článok" };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const initialPost = getPostBySlug(slug) ?? null;

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <BlogPostView slug={slug} initialPost={initialPost} />
    </main>
  );
}
