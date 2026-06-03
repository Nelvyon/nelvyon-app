import Link from "next/link";

import type { ServicePageContent } from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { Button } from "@/components/pa/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/pa/ui/accordion";

export function ServiceDetailPage({ content }: { content: ServicePageContent }) {
  return (
    <div className="w-full">
      <Container className="flex flex-col gap-8 pt-28 pb-12 md:pt-40">
        <span className="text-[#0084FF] text-xs font-medium uppercase tracking-wider">
          {content.eyebrow}
        </span>
        <Header>{content.title}</Header>
        <p className="text-muted-foreground -tracking-xs max-w-3xl text-lg leading-7 font-medium">
          {content.summary}
        </p>
      </Container>

      <Container className="flex flex-col gap-20 py-12 md:py-20">
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="bg-natural-white rounded-3xl p-8 text-natural-black">
            <h2 className="-tracking-sm text-xl font-medium">Qué es</h2>
            <p className="text-muted-foreground mt-4 text-base leading-6">{content.whatIs}</p>
          </div>
          <div className="bg-natural-black rounded-3xl border border-white/10 p-8 text-natural-white">
            <h2 className="-tracking-sm text-xl font-medium">Para quién</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {content.forWho.map((item) => (
                <li key={item} className="text-muted-foreground flex gap-2 text-base leading-6">
                  <span className="text-[#0084FF]">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="-tracking-sm mb-6 text-2xl font-medium text-white">Beneficios</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {content.benefits.map((b) => (
              <div
                key={b}
                className="rounded-2xl border border-[#0084FF]/20 bg-[#0084FF]/5 p-6 text-base leading-6 text-white"
              >
                {b}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-natural-white rounded-3xl p-8 text-natural-black md:p-12">
          <h2 className="-tracking-sm text-2xl font-medium">Qué incluye</h2>
          <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {content.includes.map((item) => (
              <li key={item} className="flex gap-2 text-base leading-6">
                <span className="text-[#0084FF] font-medium">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="-tracking-sm mb-8 text-2xl font-medium text-white">Proceso de trabajo</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {content.process.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-[#020817] p-6"
              >
                <span className="text-[#0084FF] text-sm font-medium">{step.title}</span>
                <p className="text-muted-foreground mt-3 text-sm leading-6">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h2 className="-tracking-sm mb-6 text-2xl font-medium text-white">Preguntas frecuentes</h2>
            <Accordion>
              {content.faq.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`} className="py-4">
                  <AccordionTrigger className="text-base font-medium text-white">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="bg-natural-white flex flex-col justify-between gap-6 rounded-3xl p-8">
            <div>
              <h3 className="-tracking-sm text-2xl font-medium text-natural-black">
                ¿Hablamos de {content.title.toLowerCase()}?
              </h3>
              <p className="text-muted-foreground mt-3 text-base leading-6">
                Cuéntanos tu situación y definimos alcance, plazos y siguiente paso.
              </p>
            </div>
            <Button text="Solicitar información" href="/contacto" />
          </div>
        </section>
      </Container>
    </div>
  );
}
