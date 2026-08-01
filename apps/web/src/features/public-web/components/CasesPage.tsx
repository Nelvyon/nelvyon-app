import Image from "next/image";
import Link from "next/link";

import { useCasesCatalog } from "../content/catalog";
import { caseStudies } from "../content/siteContent";
import {
  DeepHero,
  DeepPageShell,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

type CasesPageProps = {
  /** When true, shows casos-de-exito framing with link to casos-de-uso */
  successStoriesMode?: boolean;
};

export function CasesPage({ successStoriesMode = false }: CasesPageProps) {
  return (
    <DeepPageShell
      ctaTitle="Construyamos el siguiente perfil"
      ctaBody="Diagnóstico inicial, alcance claro y activación de SaaS o packs según su operación."
    >
      <DeepHero
        eyebrow={successStoriesMode ? "Casos de éxito" : "Casos de uso"}
        title={
          successStoriesMode
            ? "Perfiles de proyecto anonimizados"
            : "Cómo NELVYON resuelve operaciones reales"
        }
        description={
          successStoriesMode
            ? "Rangos de capacidad y objetivos típicos — no testimonios con nombre inventado. Para enfoques metodológicos detallados, explore /casos-de-uso."
            : "Perfiles tipificados de implementación: captación local, retención ecommerce, pipeline SaaS B2B y gobierno enterprise."
        }
        primaryCta={{ label: "Hablar de su caso", href: "/contacto" }}
        secondaryCta={{ label: "Ver sectores", href: "/sectores" }}
        image="/brand/public/library/photos/F-02.webp"
        imageAlt="Profesionales revisando resultados"
      />

      {successStoriesMode ? (
        <SectionShell soft className="border-b border-[var(--nv-border)]">
          <Container>
            <Reveal>
              <div className="nv-public-panel p-6 md:p-8">
                <p className="text-sm leading-relaxed text-[var(--nv-muted)]">
                  Esta página recoge perfiles anonimizados de capacidad. Para casos de uso con narrativa paso a paso
                  (situación → enfoque → resultado), visite{" "}
                  <Link href="/casos-de-uso" className="font-semibold text-[var(--nv-accent-deep)] hover:underline">
                    /casos-de-uso
                  </Link>
                  .
                </p>
              </div>
            </Reveal>
          </Container>
        </SectionShell>
      ) : null}

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Casos de uso"
              title="Explore por perfil operativo"
              description="Cada caso enlaza a la página profunda con narrativa, métricas tipificadas y enlaces al SaaS."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {useCasesCatalog.map((item, i) => (
              <Reveal key={item.id} delayMs={i * 40}>
                <Link href={`/casos-de-uso/${item.slug}`} className="nv-public-icon-card group block h-full overflow-hidden !p-0">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nv-accent-deep)]">
                      {item.audience}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--nv-fg-strong)]">{item.name}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.short}</p>
                    <span className="mt-5 inline-flex text-sm font-semibold text-[var(--nv-accent-deep)]">Ver caso →</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </SectionShell>

      {successStoriesMode ? (
        <SectionShell soft>
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Perfiles anonimizados"
                title="Rangos de capacidad"
                description="Las métricas describen objetivos típicos; no son testimonios de clientes con nombre inventado."
              />
            </Reveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {caseStudies.map((item, i) => (
                <Reveal key={item.id} delayMs={i * 40}>
                  <article className="nv-public-panel h-full p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nv-accent-deep)]">
                      {item.industry}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--nv-fg-strong)]">{item.profileLabel}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-[var(--nv-muted)]">
                      <span className="font-semibold">Reto: </span>
                      {item.challenge}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                      <span className="font-semibold">Enfoque: </span>
                      {item.solution}
                    </p>
                    <ul className="mt-5 space-y-2">
                      {item.resultMetrics.map((m) => (
                        <li key={m} className="flex gap-3 text-sm text-[var(--nv-muted)]">
                          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                          {m}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-xs text-[var(--nv-muted)]">{item.framingNote}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </Container>
        </SectionShell>
      ) : null}
    </DeepPageShell>
  );
}
