import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { blog } from "@/lib/pa/source";
import { BlogHeader } from "@/components/pa/blogs/blog-header";
import { Content } from "@/components/pa/blogs/content";
import { SuggestedBlogs } from "@/components/pa/blogs/suggested-blogs";

interface BlogPostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { id } = await params;
  const page = blog.getPage([id]);
  if (!page) {
    return {};
  }
  return {
    title: `${page.data.title} | Blog NELVYON`,
    description: page.data.description,
  };
}

export function generateStaticParams() {
  return blog
    .getPages()
    .map((post) => post.slugs?.[0])
    .filter((slug): slug is string => Boolean(slug))
    .map((id) => ({ id }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;
  const page = blog.getPage([id]);
  if (!page) {
    notFound();
  }

  return (
    <>
      <BlogHeader page={page} />
      <Content page={page} />
      <SuggestedBlogs />
    </>
  );
}
