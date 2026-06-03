import type { ServicePageContent } from "@/config/nelvyon-marketing-pages";
import { nelvyonPageCtas } from "@/config/nelvyon-pa-content";
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
        <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
          {content.eyebrow}
        </span>
        <Header>{content.title}</Header>
        <p className="-tracking-xs max-w-3xl text-lg leading-7 font-medium text-white/75">
          {content.summary}
        </p>
      </Container>

      <Container className="flex flex-col gap-20 py-12 md:py-20">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#07111F] p-8">
            <h2 className="-tracking-sm text-xl font-medium text-white">Qué es</h2>
            <p className="mt-4 text-base leading-6 text-white/70">{content.whatIs}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#020817] p-8">
            <h2 className="-tracking-sm text-xl font-medium text-white">Para quién</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {content.forWho.map((item) => (
                <li key={item} className="flex gap-2 text-base leading-6 text-white/70">
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
                className="rounded-2xl border border-[#0084FF]/25 bg-[#0084FF]/10 p-6 text-base leading-6 text-white/85"
              >
                {b}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#07111F] p-8 md:p-12">
          <h2 className="-tracking-sm text-2xl font-medium text-white">Qué incluye</h2>
          <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {content.includes.map((item) => (
              <li key={item} className="flex gap-2 text-base leading-6 text-white/75">
                <span className="font-medium text-[#0084FF]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="-tracking-sm mb-8 text-2xl font-medium text-white">Proceso de trabajo</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.process.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-[#020817] p-6"
              >
                <span className="text-sm font-medium text-[#0084FF]">{step.title}</span>
                <p className="mt-3 text-sm leading-6 text-white/70">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h2 className="-tracking-sm mb-6 text-2xl font-medium text-white">Preguntas frecuentes</h2>
            <Accordion>
              {content.faq.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`} className="border-white/10 py-4">
                  <AccordionTrigger className="text-base font-medium text-white/90">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-[#0084FF]/30 bg-gradient-to-br from-[#0084FF]/10 to-[#07111F] p-8">
            <div>
              <h3 className="-tracking-sm text-2xl font-medium text-white">
                ¿Hablamos de {content.title.toLowerCase()}?
              </h3>
              <p className="mt-3 text-base leading-6 text-white/75">
                Cuéntanos tu situación y definimos alcance, plazos y siguiente paso.
              </p>
            </div>
            <Button variant="primary" text={nelvyonPageCtas.servicios} href="/contacto" />
          </div>
        </section>
      </Container>
    </div>
  );
}
