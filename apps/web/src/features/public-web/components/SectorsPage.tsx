import Image from "next/image";
import Link from "next/link";

import { sectorsCatalog } from "../content/catalog";
import { libraryPhoto } from "../content/visualLibrary";
import {
  DeepHero,
  DeepPageShell,
} from "./DeepPage";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

export function SectorsPage() {
  return (
    <DeepPageShell
      ctaTitle="¿Su sector requiere un diseño específico?"
      ctaBody="Definimos flujos, integraciones y packs según su modelo de negocio."
    >
      <DeepHero
        eyebrow="Sectores"
        title="NELVYON adaptado a su industria"
        description="Negocios locales, ecommerce, SaaS B2B, servicios profesionales, salud y enterprise — cada sector tiene retos, módulos y servicios recomendados documentados."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Casos de uso", href: "/casos-de-uso" }}
        image={libraryPhoto("F-02")}
        imageAlt="Centro de negocio contemporáneo — sectores NELVYON"
      />

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Explore por sector"
              title="Seleccione su perfil"
              description="Cada tarjeta enlaza a la página profunda con retos, resultados, módulos SaaS y servicios de agencia."
              align="center"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sectorsCatalog.map((sector, i) => (
              <Reveal key={sector.id} delayMs={i * 35}>
                <Link href={`/sectores/${sector.slug}`} className="nv-public-icon-card group block h-full overflow-hidden !p-0">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={sector.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-[var(--nv-fg-strong)]">{sector.name}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{sector.short}</p>
                    <ul className="mt-5 space-y-2">
                      {sector.outcomes.slice(0, 2).map((o) => (
                        <li key={o} className="flex gap-3 text-sm text-[var(--nv-muted)]">
                          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                          {o}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-5 inline-flex text-sm font-semibold text-[var(--nv-accent-deep)]">Ver sector →</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </SectionShell>
    </DeepPageShell>
  );
}
