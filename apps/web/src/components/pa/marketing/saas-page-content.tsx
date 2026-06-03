import {
  nelvyonSaasFaq,
  nelvyonSaasHero,
  nelvyonSaasModules,
  nelvyonSaasPage,
  nelvyonSaasPanel,
  nelvyonSaasProblem,
  nelvyonSaasRoadmap,
  nelvyonSaasVision,
} from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { Button } from "@/components/pa/button";
import { PaDashboardMock } from "@/components/pa/marketing/pa-dashboard-mock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/pa/ui/accordion";

const ROADMAP_COLUMNS = [
  { key: "disponible" as const, label: "Disponible", accent: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5" },
  { key: "enDesarrollo" as const, label: "En desarrollo", accent: "text-[#0084FF] border-[#0084FF]/30 bg-[#0084FF]/5" },
  { key: "planificado" as const, label: "Planificado", accent: "text-white/70 border-white/15 bg-white/[0.03]" },
];

const PANEL_ACCENTS = [
  "from-[#0084FF]/20 via-[#0047AB]/10 to-transparent border-[#0084FF]/35",
  "from-[#0047AB]/25 via-[#0084FF]/8 to-transparent border-[#0047AB]/40",
  "from-[#0084FF]/15 via-transparent to-[#0047AB]/12 border-[#0084FF]/25",
  "from-[#0047AB]/20 via-[#0084FF]/10 to-transparent border-white/15",
];

export function SaasPageContent() {
  return (
    <>
      {/* Hero */}
      <section className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,132,255,0.18),transparent_70%)]" />
        <Container className="relative flex flex-col gap-8 pt-28 md:pt-40">
          <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
            Plataforma NELVYON
          </span>
          <Header>{nelvyonSaasHero.title}</Header>
          <p className="-tracking-xs max-w-3xl text-lg leading-7 font-medium text-white/75">
            {nelvyonSaasHero.subtitle}
          </p>
          <Button variant="primary" text={nelvyonSaasHero.cta} href="/contacto" />
        </Container>
      </section>

      {/* Problema */}
      <section className="w-full border-t border-white/8 py-16 md:py-24">
        <Container>
          <div className="max-w-3xl border-l-2 border-[#0084FF]/50 pl-6 md:pl-8">
            <Header>{nelvyonSaasProblem.title}</Header>
            <p className="mt-6 text-base leading-7 text-white/75 md:text-lg">{nelvyonSaasProblem.body}</p>
          </div>
        </Container>
      </section>

      {/* Qué es */}
      <section className="w-full bg-[#020817]/60 py-16 md:py-24">
        <Container className="max-w-3xl">
          <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
            Qué es NELVYON SaaS
          </span>
          <p className="-tracking-xs mt-4 text-lg leading-7 font-medium text-white/80 md:text-xl md:leading-8">
            {nelvyonSaasVision.body}
          </p>
        </Container>
      </section>

      {/* Panel — sección fuerte */}
      <section className="relative w-full border-t border-white/8 py-16 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(0,132,255,0.08),transparent_65%)]" />
        <Container className="relative flex flex-col gap-12 md:gap-16">
          <div className="mx-auto max-w-3xl text-center">
            <Header>{nelvyonSaasPanel.title}</Header>
            <p className="-tracking-xs mt-4 text-base leading-7 text-white/70 md:text-lg">
              {nelvyonSaasPanel.subtitle}
            </p>
          </div>

          <div className="mx-auto w-full max-w-4xl">
            <PaDashboardMock />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {nelvyonSaasPanel.blocks.map((block, index) => (
              <div
                key={block.id}
                className={`rounded-3xl border bg-gradient-to-br p-7 md:p-9 ${PANEL_ACCENTS[index % PANEL_ACCENTS.length]}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0084FF]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="-tracking-sm mt-3 text-xl font-medium text-white md:text-2xl">
                  {block.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/70 md:text-base">
                  {block.description}
                </p>
                <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white/75">
                      <span className="size-1.5 shrink-0 rounded-full bg-[#0084FF]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Módulos */}
      <section className="w-full bg-[#020817]/60 py-16 md:py-28">
        <Container className="flex flex-col gap-12">
          <div className="max-w-3xl">
            <Header>{nelvyonSaasPage.modulesTitle}</Header>
            <p className="-tracking-xs mt-4 text-base leading-6 text-white/70">
              {nelvyonSaasPage.modulesIntro}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nelvyonSaasModules.map((mod) => (
              <div
                key={mod.id}
                className="group rounded-2xl border border-white/10 bg-[#07111F] p-5 transition hover:border-[#0084FF]/40 hover:bg-[#07111F]/80"
              >
                <div className="mb-3 h-0.5 w-8 rounded-full bg-[#0084FF]/50 transition group-hover:w-12 group-hover:bg-[#0084FF]" />
                <h3 className="-tracking-sm text-base font-medium text-white">{mod.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{mod.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Para quién es */}
      <section className="w-full border-t border-white/8 py-16 md:py-24">
        <Container>
          <Header>{nelvyonSaasPage.audienceTitle}</Header>
          <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {nelvyonSaasPage.audiences.map((a) => (
              <li
                key={a}
                className="rounded-2xl border border-white/10 bg-[#07111F] px-5 py-5 text-center text-sm font-medium text-white/85 md:py-6 md:text-base"
              >
                {a}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Roadmap */}
      <section className="w-full bg-[#020817]/60 py-16 md:py-28">
        <Container className="flex flex-col gap-12">
          <Header>{nelvyonSaasPage.roadmapTitle}</Header>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ROADMAP_COLUMNS.map((col) => (
              <div key={col.key} className={`rounded-2xl border p-7 md:p-8 ${col.accent}`}>
                <h3 className="text-sm font-semibold uppercase tracking-wider">{col.label}</h3>
                <ul className="mt-5 space-y-3">
                  {nelvyonSaasRoadmap[col.key].map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-white/75">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current opacity-60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Qué sustituye */}
      <section className="w-full border-t border-white/8 py-16 md:py-24">
        <Container className="flex flex-col gap-10">
          <Header>{nelvyonSaasPage.replacesTitle}</Header>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nelvyonSaasPage.replacesItems.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-white/10 bg-[#07111F] px-6 py-5 text-sm font-medium text-white/85 md:text-base"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-base leading-7 text-white/70">{nelvyonSaasPage.replacesIntro}</p>
        </Container>
      </section>

      {/* FAQ */}
      <section className="w-full bg-[#020817]/60 py-16 md:py-24">
        <Container className="max-w-3xl">
          <Header>FAQ SaaS</Header>
          <Accordion className="mt-8">
            {nelvyonSaasFaq.map((item, i) => (
              <AccordionItem key={item.question} value={`saas-faq-${i}`} className="border-white/10 py-4">
                <AccordionTrigger className="text-white/90">{item.question}</AccordionTrigger>
                <AccordionContent className="text-white/70">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </section>

      {/* CTA Final */}
      <section className="w-full border-t border-white/8 py-16 md:py-24">
        <Container className="flex flex-col items-center gap-6 rounded-3xl border border-[#0084FF]/30 bg-gradient-to-br from-[#0047AB]/25 to-[#020817] p-10 text-center md:p-14">
          <h2 className="-tracking-sm text-2xl font-medium text-white md:text-3xl">
            {nelvyonSaasPage.finalCta}
          </h2>
          <Button variant="primary" text={nelvyonSaasPage.finalCta} href="/contacto" />
        </Container>
      </section>
    </>
  );
}
