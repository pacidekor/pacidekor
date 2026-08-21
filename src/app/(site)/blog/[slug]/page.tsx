import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { JsonLd } from "@/components/JsonLd";
import { getBlogPostBySlug, listBlogPosts } from "@/lib/blog-server";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  pageMetadata,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await listBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return { title: "Článok" };
  }

  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.coverImage,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([
    getBlogPostBySlug(slug),
    listBlogPosts(),
  ]);

  if (!post) notFound();

  const related = allPosts
    .filter((item) => item.slug !== post.slug)
    .sort((a, b) => {
      const aSame = a.category === post.category ? 0 : 1;
      const bSame = b.category === post.category ? 0 : 1;
      return aSame - bSame;
    })
    .slice(0, 3);

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <JsonLd
        data={[
          blogPostingJsonLd({
            title: post.title,
            excerpt: post.excerpt,
            slug: post.slug,
            coverImage: post.coverImage,
            publishedAt: post.publishedAt,
            author: post.author,
          }),
          breadcrumbJsonLd([
            { name: "Domov", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <BlogPostView post={post} related={related} />
    </main>
  );
}
