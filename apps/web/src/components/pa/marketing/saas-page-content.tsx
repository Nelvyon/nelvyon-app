import Link from "next/link";

import {
  nelvyonSaasFaq,
  nelvyonSaasHero,
  nelvyonSaasModules,
  nelvyonSaasPage,
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

export function SaasPageContent() {
  return (
    <>
      <Container className="flex flex-col gap-8 pt-28 md:pt-40">
        <span className="text-[#0084FF] text-xs font-medium uppercase tracking-wider">
          Plataforma NELVYON
        </span>
        <Header>{nelvyonSaasHero.title}</Header>
        <p className="text-muted-foreground -tracking-xs max-w-3xl text-lg leading-7 font-medium">
          {nelvyonSaasHero.subtitle}
        </p>
        <Button text={nelvyonPageCtas.saas} href="/contacto" />
      </Container>

      <section className="w-full py-12 md:py-20">
        <Container className="flex flex-col gap-8">
          <Header>{nelvyonSaasPage.replacesTitle}</Header>
          <p className="text-muted-foreground max-w-3xl text-base leading-6">
            {nelvyonSaasPage.replacesIntro}
          </p>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {nelvyonSaasPage.replacesItems.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-[#0084FF]/25 bg-[#0084FF]/5 px-4 py-3 text-sm font-medium text-white"
              >
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="w-full py-12 md:py-20">
        <Container className="flex flex-col gap-12">
          <Header>Módulos de la plataforma</Header>
          <p className="text-muted-foreground -tracking-xs max-w-3xl text-base leading-6">
            Cada módulo aporta una capa del sistema. La disponibilidad depende de tu plan,
            workspace e integraciones activas.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nelvyonSaasModules.map((mod) => (
              <div
                key={mod.id}
                className="rounded-2xl border border-white/10 bg-[#020817] p-6 transition hover:border-[#0084FF]/40"
              >
                <h3 className="-tracking-sm text-lg font-medium text-[#0084FF]">{mod.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">{mod.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="w-full py-12 md:py-20">
        <Container>
          <Header>{nelvyonSaasPage.audienceTitle}</Header>
          <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            {nelvyonSaasPage.audiences.map((a) => (
              <li
                key={a}
                className="flex gap-3 rounded-2xl border border-white/10 px-5 py-4 text-base leading-6 text-white"
              >
                <span className="text-[#0084FF]">→</span>
                {a}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="w-full py-12 md:py-20">
        <Container className="rounded-3xl border border-[#0084FF]/30 bg-[#0047AB]/20 p-8 md:p-12">
          <h2 className="-tracking-sm text-2xl font-medium text-white md:text-3xl">
            {nelvyonSaasPage.differenceTitle}
          </h2>
          <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-7">
            {nelvyonSaasPage.differenceBody}
          </p>
        </Container>
      </section>

      <section className="w-full py-12 md:py-20">
        <Container className="max-w-3xl">
          <Header>Preguntas frecuentes SaaS</Header>
          <Accordion className="mt-8">
            {nelvyonSaasFaq.map((item, i) => (
              <AccordionItem key={item.question} value={`saas-faq-${i}`} className="border-white/10 py-4">
                <AccordionTrigger className="text-white">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-10">
            <Link
              href="/pricing"
              className="text-[#0084FF] text-sm font-medium hover:underline"
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
