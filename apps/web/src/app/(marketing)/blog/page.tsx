import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { blog } from "@/lib/pa/source";
import { Container, PageHero, CtaBand } from "@/features/public-web/components/ui";
import { Reveal } from "@/features/public-web/components/Reveal";

export const metadata: Metadata = {
  title: "Blog | NELVYON",
  description:
    "Articulos sobre plataforma SaaS, automatizacion, packs OS, seguridad y operacion de marketing con IA.",
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
      <PageHero
        eyebrow="Recursos"
        title="Blog NELVYON"
        description="Contenido util sobre plataforma, automatizacion, seguridad y operacion, sin relleno generico."
        primaryCta={{ label: "Centro de recursos", href: "/recursos" }}
        secondaryCta={{ label: "FAQ", href: "/faq" }}
      />
      <section className="py-14 md:py-20">
        <Container>
          {posts.length === 0 ? (
            <p className="text-[var(--nv-muted)]">No hay articulos publicados todavia.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((page, i) => {
                const slug = page.slugs?.[0];
                if (!slug) return null;
                const title = String(page.data.title ?? slug);
                const description = String(page.data.description ?? "");
                const cover = COVER_BY_INDEX[i % COVER_BY_INDEX.length];
                return (
                  <Reveal key={slug} delayMs={i * 40}>
                    <Link
                      href={`/blog/${slug}`}
                      className="nv-public-panel group flex h-full flex-col overflow-hidden transition-colors hover:border-[rgba(0,132,255,0.4)]"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={cover}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <h2 className="text-lg font-semibold text-white group-hover:text-[var(--nv-accent)]">
                          {title}
                        </h2>
                        {description ? (
                          <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--nv-muted)]">
                            {description}
                          </p>
                        ) : null}
                        <span className="mt-5 text-sm font-medium text-[var(--nv-accent)]">Leer articulo</span>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}
        </Container>
      </section>
      <CtaBand
        title="Quiere aplicar esto a su operacion?"
        body="Hable con el equipo sobre SaaS, packs o enterprise."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
      />
    </>
  );
}
