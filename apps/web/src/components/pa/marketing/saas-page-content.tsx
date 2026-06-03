import Link from "next/link";

import {
  nelvyonSaasFaq,
  nelvyonSaasHero,
  nelvyonSaasModuleCategories,
  nelvyonSaasModules,
  nelvyonSaasPage,
  type SaasModuleCategory,
} from "@/config/nelvyon-marketing-pages";
import { nelvyonPageCtas } from "@/config/nelvyon-pa-content";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { Button } from "@/components/pa/button";
import { Pricing } from "@/components/pa/pricing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/pa/ui/accordion";

function modulesForCategory(category: SaasModuleCategory) {
  return nelvyonSaasModules.filter((mod) => mod.category === category);
}

export function SaasPageContent() {
  return (
    <>
      <Container className="flex flex-col gap-8 pt-28 md:pt-40">
        <span className="text-[#0084FF] text-xs font-medium uppercase tracking-wider">
          Plataforma NELVYON
        </span>
        <Header>{nelvyonSaasHero.title}</Header>
        <p className="-tracking-xs max-w-3xl text-lg leading-7 font-medium text-white/75">
          {nelvyonSaasHero.subtitle}
        </p>
        <Button variant="primary" text={nelvyonPageCtas.saas} href="/contacto" />
      </Container>

      <section className="w-full border-t border-white/8 py-12 md:py-20">
        <Container className="flex flex-col gap-8">
          <Header>{nelvyonSaasPage.replacesTitle}</Header>
          <p className="max-w-3xl text-base leading-6 text-white/70">
            {nelvyonSaasPage.replacesIntro}
          </p>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {nelvyonSaasPage.replacesItems.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-white/10 bg-[#07111F] px-4 py-3 text-sm font-medium text-white/90"
              >
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="w-full bg-[#020817]/60 py-14 md:py-24">
        <Container className="flex flex-col gap-10 md:gap-14">
          <div className="max-w-3xl">
            <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
              Capas del sistema
            </span>
            <Header className="mt-3">Módulos de la plataforma</Header>
            <p className="-tracking-xs mt-4 text-base leading-6 text-white/75">
              Cada módulo aporta una capa del sistema. La disponibilidad depende de tu plan,
              workspace e integraciones activas.
            </p>
          </div>

          <div className="flex flex-col gap-10 md:gap-12">
            {nelvyonSaasModuleCategories.map((category) => {
              const mods = modulesForCategory(category);
              if (mods.length === 0) return null;
              return (
                <div key={category} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 border-b border-white/8 pb-3">
                    <span className="rounded-full border border-[#0084FF]/35 bg-[#0084FF]/10 px-3 py-1 text-xs font-medium text-[#0084FF]">
                      {category}
                    </span>
                    <span className="text-sm text-white/55">
                      {mods.length} {mods.length === 1 ? "módulo" : "módulos"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {mods.map((mod) => (
                      <div
                        key={mod.id}
                        className="rounded-2xl border border-white/10 bg-[#07111F] p-6 transition hover:border-[#0084FF]/35"
                      >
                        <h3 className="-tracking-sm text-lg font-medium text-white">
                          {mod.title}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-white/70">{mod.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="w-full border-t border-white/8 py-12 md:py-20">
        <Container>
          <Header>{nelvyonSaasPage.audienceTitle}</Header>
          <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            {nelvyonSaasPage.audiences.map((a) => (
              <li
                key={a}
                className="flex gap-3 rounded-2xl border border-white/10 bg-[#07111F] px-5 py-4 text-base leading-6 text-white/85"
              >
                <span className="text-[#0084FF]">→</span>
                {a}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="w-full py-12 md:py-20">
        <Container className="rounded-3xl border border-[#0084FF]/30 bg-gradient-to-br from-[#0047AB]/25 to-[#020817] p-8 md:p-12">
          <h2 className="-tracking-sm text-2xl font-medium text-white md:text-3xl">
            {nelvyonSaasPage.differenceTitle}
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-7 text-white/75">
            {nelvyonSaasPage.differenceBody}
          </p>
        </Container>
      </section>

      <section className="w-full border-t border-white/8 py-12 md:py-20">
        <Container className="max-w-3xl">
          <Header>Preguntas frecuentes SaaS</Header>
          <Accordion className="mt-8">
            {nelvyonSaasFaq.map((item, i) => (
              <AccordionItem key={item.question} value={`saas-faq-${i}`} className="border-white/10 py-4">
                <AccordionTrigger className="text-white/90">{item.question}</AccordionTrigger>
                <AccordionContent className="text-white/70">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-10">
            <Link
              href="/pricing"
              className="text-sm font-medium text-[#0084FF] hover:underline"
            >
              Ver planes y precios →
            </Link>
          </div>
        </Container>
      </section>

      <Pricing disabelHeader ctaText={nelvyonPageCtas.saas} />
    </>
  );
}
