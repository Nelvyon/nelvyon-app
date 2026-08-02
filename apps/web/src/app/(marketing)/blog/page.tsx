import type { Metadata } from "next";
import Link from "next/link";

import { blog } from "@/lib/pa/source";
import { AiorCardLink, AiorSection, AiorTitle } from "@/features/public-web/components/AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "@/features/public-web/components/AiorPageHero";

export const metadata: Metadata = {
  title: { absolute: "Blog | NELVYON" },
  description:
    "Artículos sobre plataforma SaaS, automatización, packs OS, seguridad y operación de marketing con IA.",
  alternates: { canonical: "/blog" },
};

const COVER_BY_INDEX = [
  "/brand/public/blog-infra.webp",
  "/brand/public/blog-cloud.webp",
  "/brand/public/blog-team.webp",
] as const;

export default function BlogPage() {
  const posts = blog.getPages();

  return (
    <>
      <AiorPageHero
        eyebrow="Recursos"
        title="Blog NELVYON"
        description="Contenido útil sobre plataforma, automatización, seguridad y operación, sin relleno genérico."
        primaryCta={{ label: "Centro de recursos", href: "/recursos" }}
        secondaryCta={{ label: "FAQ", href: "/faq" }}
      />
      <AiorSection>
        <AiorTitle eyebrow="Artículos" title="Publicaciones" center />
        {posts.length === 0 ? (
          <p className="text-center" style={{ color: "#484848" }}>
            No hay artículos publicados todavía.
          </p>
        ) : (
          <div className="row gy-4">
            {posts.map((page, i) => {
              const slug = page.slugs?.[0];
              if (!slug) return null;
              const title = String(page.data.title ?? slug);
              const description = String(page.data.description ?? "");
              const cover = COVER_BY_INDEX[i % COVER_BY_INDEX.length];
              return (
                <div key={slug} className="col-md-6 col-xl-4">
                  <AiorCardLink href={`/blog/${slug}`} title={title} body={description || "Leer artículo"} image={cover} />
                </div>
              );
            })}
          </div>
        )}
        <div className="text-center mt-40">
          <Link href="/recursos" className="th-btn2 style5">
            Volver a recursos
          </Link>
        </div>
      </AiorSection>
      <AiorCtaBand
        title="¿Quiere hablar de su operación?"
        body="Demo SaaS o presupuesto de agencia — sin formularios demo genéricos."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}
