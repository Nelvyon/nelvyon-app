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
import { NarrativeStep } from "@/components/pa/marketing/narrative-step";
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
  "from-[#0084FF]/22 via-[#0047AB]/12 to-[#020817] border-[#0084FF]/40 shadow-[0_0_40px_rgba(0,132,255,0.08)]",
  "from-[#0047AB]/28 via-[#0084FF]/10 to-[#020817] border-[#0047AB]/45 shadow-[0_0_40px_rgba(0,71,171,0.1)]",
  "from-[#0084FF]/18 via-transparent to-[#0047AB]/14 border-[#0084FF]/30",
  "from-[#0047AB]/22 via-[#0084FF]/12 to-[#020817] border-white/18",
];

export function SaasPageContent() {
  return (
    <>
      {/* Hero + Dashboard protagonista */}
      <section className="relative w-full overflow-hidden pb-4 md:pb-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-20%,rgba(0,132,255,0.28),transparent_68%)]" />
        <Container className="relative flex flex-col gap-10 pt-28 md:gap-14 md:pt-40">
          <div className="max-w-3xl">
            <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
              Plataforma NELVYON
            </span>
            <Header className="mt-3">{nelvyonSaasHero.title}</Header>
            <p className="-tracking-xs mt-4 max-w-2xl text-lg leading-7 font-medium text-white/75">
              {nelvyonSaasHero.subtitle}
            </p>
            <div className="mt-8">
              <Button variant="primary" text={nelvyonSaasHero.cta} href="/contacto" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <NarrativeStep label="02" title="Centralización" />
            <PaDashboardMock
              featured
              title="Centro de control empresarial"
              badge="Panel NELVYON SaaS"
            />
          </div>
        </Container>
      </section>

      {/* Problema */}
      <section className="w-full border-t border-white/10 bg-[#020817]/40 py-20 md:py-32">
        <Container>
          <NarrativeStep label="01" title="Problema" />
          <div className="mt-8 max-w-3xl border-l-2 border-[#0084FF]/60 pl-6 md:mt-10 md:pl-10">
            <Header>{nelvyonSaasProblem.title}</Header>
            <p className="mt-6 text-base leading-8 text-white/75 md:text-lg">{nelvyonSaasProblem.body}</p>
          </div>
        </Container>
      </section>

      {/* Qué es */}
      <section className="w-full border-t border-white/10 py-20 md:py-32">
        <Container className="max-w-3xl">
          <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
            Qué es NELVYON SaaS
          </span>
          <p className="-tracking-xs mt-5 text-lg leading-8 font-medium text-white/85 md:text-xl md:leading-9">
            {nelvyonSaasVision.body}
          </p>
        </Container>
      </section>

      {/* Panel operativo */}
      <section className="relative w-full border-t border-white/10 bg-[#020817]/50 py-20 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_50%,rgba(0,132,255,0.12),transparent_70%)]" />
        <Container className="relative flex flex-col gap-14 md:gap-20">
          <div className="mx-auto max-w-3xl text-center">
            <Header>{nelvyonSaasPanel.title}</Header>
            <p className="-tracking-xs mt-5 text-base leading-8 text-white/70 md:text-lg">
              {nelvyonSaasPanel.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {nelvyonSaasPanel.blocks.map((block, index) => (
              <div
                key={block.id}
                className={`rounded-3xl border bg-gradient-to-br p-8 md:p-10 ${PANEL_ACCENTS[index % PANEL_ACCENTS.length]}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0084FF]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="-tracking-sm mt-4 text-xl font-medium text-white md:text-2xl">
                  {block.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/72 md:text-base">{block.description}</p>
                <ul className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white/78">
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

      {/* Automatización — módulos */}
      <section className="w-full border-t border-white/10 py-20 md:py-32">
        <Container className="flex flex-col gap-14">
          <div className="max-w-3xl">
            <NarrativeStep label="03" title="Automatización" />
            <Header className="mt-6">{nelvyonSaasPage.modulesTitle}</Header>
            <p className="-tracking-xs mt-4 text-base leading-7 text-white/70">
              {nelvyonSaasPage.modulesIntro}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nelvyonSaasModules.map((mod) => (
              <div
                key={mod.id}
                className="group rounded-2xl border border-white/12 bg-[#07111F] p-6 transition hover:border-[#0084FF]/45 hover:shadow-[0_0_32px_rgba(0,132,255,0.08)]"
              >
                <div className="mb-4 h-0.5 w-10 rounded-full bg-[#0084FF]/50 transition group-hover:w-14 group-hover:bg-[#0084FF]" />
                <h3 className="-tracking-sm text-base font-medium text-white">{mod.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/68">{mod.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* IA + escalabilidad */}
      <section className="w-full border-t border-white/10 bg-[#020817]/50 py-20 md:py-32">
        <Container className="flex flex-col gap-14">
          <NarrativeStep label="04" title="IA" />
          <Header>{nelvyonSaasPage.audienceTitle}</Header>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {nelvyonSaasPage.audiences.map((a) => (
              <li
                key={a}
                className="rounded-2xl border border-white/12 bg-[#07111F] px-5 py-6 text-center text-sm font-medium text-white/88 md:text-base"
              >
                {a}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="w-full border-t border-white/10 py-20 md:py-32">
        <Container className="flex flex-col gap-14">
          <NarrativeStep label="05" title="Escalabilidad" />
          <Header>{nelvyonSaasPage.roadmapTitle}</Header>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {ROADMAP_COLUMNS.map((col) => (
              <div key={col.key} className={`rounded-2xl border p-8 md:p-9 ${col.accent}`}>
                <h3 className="text-sm font-semibold uppercase tracking-wider">{col.label}</h3>
                <ul className="mt-6 space-y-3.5">
                  {nelvyonSaasRoadmap[col.key].map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-7 text-white/78">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="w-full border-t border-white/10 bg-[#020817]/40 py-20 md:py-28">
        <Container className="flex flex-col gap-10">
          <Header>{nelvyonSaasPage.replacesTitle}</Header>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nelvyonSaasPage.replacesItems.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-white/12 bg-[#07111F] px-6 py-5 text-sm font-medium text-white/88 md:text-base"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-base leading-8 text-white/72">{nelvyonSaasPage.replacesIntro}</p>
        </Container>
      </section>

      <section className="w-full border-t border-white/10 py-20 md:py-28">
        <Container className="max-w-3xl">
          <Header>FAQ SaaS</Header>
          <Accordion className="mt-10">
            {nelvyonSaasFaq.map((item, i) => (
              <AccordionItem key={item.question} value={`saas-faq-${i}`} className="border-white/10 py-4">
                <AccordionTrigger className="text-white/92">{item.question}</AccordionTrigger>
                <AccordionContent className="text-white/72">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </section>

      <section className="w-full border-t border-white/10 py-20 md:py-28">
        <Container className="flex flex-col items-center gap-7 rounded-3xl border border-[#0084FF]/35 bg-gradient-to-br from-[#0047AB]/30 to-[#020817] p-10 text-center shadow-[0_0_80px_rgba(0,132,255,0.12)] md:p-16">
          <h2 className="-tracking-sm text-2xl font-medium text-white md:text-3xl">
            {nelvyonSaasPage.finalCta}
          </h2>
          <Button variant="primary" text={nelvyonSaasPage.finalCta} href="/contacto" />
        </Container>
      </section>
    </>
  );
}
