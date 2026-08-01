import { caseStudies, pageContent } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero } from "./ui";

export function CasesPage() {
  const content = pageContent["casos-de-exito"];
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Hablar de su caso", href: "/contacto" }}
        secondaryCta={{ label: "Ver sectores", href: "/sectores" }}
        imageSrc="/brand/public/enterprise-meeting.webp"
        imageAlt="Profesionales revisando resultados en reunion"
      />
      <section className="py-14 md:py-20">
        <Container>
          <p className="mb-8 max-w-3xl text-sm text-[var(--nv-muted)]">
            Perfiles de proyecto anonimizados. Las metricas describen rangos de capacidad u objetivos tipicos;
            no son testimonios de clientes con nombre inventado.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {caseStudies.map((item, i) => (
              <Reveal key={item.id} delayMs={i * 40}>
                <article className="nv-public-panel h-full p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nv-accent)]">
                    {item.industry}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{item.profileLabel}</h2>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--nv-muted)]">
                    <span className="font-semibold text-slate-300">Reto: </span>
                    {item.challenge}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">
                    <span className="font-semibold text-slate-300">Enfoque: </span>
                    {item.solution}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {item.resultMetrics.map((m) => (
                      <li key={m} className="flex gap-3 text-sm text-slate-300">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-xs text-slate-500">{item.framingNote}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="Construyamos el siguiente perfil"
        body="Diagnostico inicial, alcance claro y activacion de plataforma o packs segun su operacion."
        primaryCta={{ label: "Solicitar diagnostico", href: "/contacto" }}
      />
    </>
  );
}
