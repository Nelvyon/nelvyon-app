import {
  nelvyonSaasFaq,
  nelvyonSaasHero,
  nelvyonSaasModules,
  nelvyonSaasPage,
  nelvyonSaasProblem,
  nelvyonSaasRoadmap,
  nelvyonSaasVision,
} from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { Button } from "@/components/pa/button";
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

export function SaasPageContent() {
  return (
    <>
      {/* 1. Hero */}
      <Container className="flex flex-col gap-8 pt-28 md:pt-40">
        <Header>{nelvyonSaasHero.title}</Header>
        <p className="-tracking-xs max-w-3xl text-lg leading-7 font-medium text-white/75">
          {nelvyonSaasHero.subtitle}
        </p>
        <Button variant="primary" text={nelvyonSaasHero.cta} href="/contacto" />
      </Container>

      {/* 2. Problema actual */}
      <section className="w-full border-t border-white/8 py-12 md:py-20">
        <Container className="flex max-w-3xl flex-col gap-6">
          <Header>{nelvyonSaasProblem.title}</Header>
          <p className="text-base leading-7 text-white/75">{nelvyonSaasProblem.body}</p>
        </Container>
      </section>

      {/* 3. Qué es NELVYON SaaS */}
      <section className="w-full bg-[#020817]/60 py-12 md:py-20">
        <Container className="max-w-3xl">
          <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
            Qué es NELVYON SaaS
          </span>
          <p className="-tracking-xs mt-4 text-lg leading-7 font-medium text-white/80">
            {nelvyonSaasVision.body}
          </p>
        </Container>
      </section>

      {/* 4. Qué puede gestionar */}
      <section className="w-full border-t border-white/8 py-12 md:py-20">
        <Container className="flex flex-col gap-10">
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
                className="rounded-2xl border border-white/10 bg-[#07111F] p-5 transition hover:border-[#0084FF]/35"
              >
                <h3 className="-tracking-sm text-base font-medium text-white">{mod.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{mod.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 5. Para quién es */}
      <section className="w-full bg-[#020817]/60 py-12 md:py-20">
        <Container>
          <Header>{nelvyonSaasPage.audienceTitle}</Header>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {nelvyonSaasPage.audiences.map((a) => (
              <li
                key={a}
                className="rounded-xl border border-white/10 bg-[#07111F] px-5 py-4 text-center text-sm font-medium text-white/85 md:text-base"
              >
                {a}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 6. Roadmap */}
      <section className="w-full border-t border-white/8 py-12 md:py-20">
        <Container className="flex flex-col gap-10">
          <Header>{nelvyonSaasPage.roadmapTitle}</Header>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ROADMAP_COLUMNS.map((col) => (
              <div
                key={col.key}
                className={`rounded-2xl border p-6 ${col.accent}`}
              >
                <h3 className="text-sm font-semibold uppercase tracking-wider">{col.label}</h3>
                <ul className="mt-4 space-y-3">
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

      {/* 7. Qué sustituye */}
      <section className="w-full bg-[#020817]/60 py-12 md:py-20">
        <Container className="flex flex-col gap-8">
          <Header>{nelvyonSaasPage.replacesTitle}</Header>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nelvyonSaasPage.replacesItems.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-white/10 bg-[#07111F] px-5 py-4 text-sm font-medium text-white/85"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-base leading-6 text-white/70">{nelvyonSaasPage.replacesIntro}</p>
        </Container>
      </section>

      {/* 8. FAQ SaaS */}
      <section className="w-full border-t border-white/8 py-12 md:py-20">
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

      {/* 9. CTA Final */}
      <section className="w-full border-t border-white/8 py-12 md:py-20">
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
