import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { blog } from "@/lib/pa/source";
import { BrandBlogContent } from "@/features/public-web/components/BrandBlogContent";
import { BrandSection } from "@/features/public-web/components/BrandBlocks";
import { BrandCtaBand, BrandPageHero } from "@/features/public-web/components/BrandPageHero";

interface BlogPostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { id } = await params;
  const page = blog.getPage([id]);
  if (!page) return {};
  return {
    title: { absolute: `${page.data.title} | Blog NELVYON` },
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
  if (!page) notFound();

  const dateLabel = new Date(page.data.date).toLocaleDateString("es-ES", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <BrandPageHero
        eyebrow="Blog"
        title={String(page.data.title)}
        description={`${dateLabel}${page.data.timeToRead ? ` · ${page.data.timeToRead}` : ""}${
          page.data.description ? ` — ${page.data.description}` : ""
        }`}
        primaryCta={{ label: "Todos los artículos", href: "/blog" }}
        secondaryCta={{ label: "Recursos", href: "/recursos" }}
      />
      <BrandSection>
        <BrandBlogContent page={page} />
        <p className="mt-40 text-center">
          <Link href="/blog" className="th-btn2 style5">
            Volver al blog
          </Link>
        </p>
      </BrandSection>
      <BrandCtaBand
        title="¿Quiere aplicar esto a su operación?"
        body="Hable con el equipo sobre SaaS, agencia o ambos."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
