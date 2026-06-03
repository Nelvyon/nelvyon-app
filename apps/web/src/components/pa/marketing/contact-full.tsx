import Link from "next/link";

import { nelvyonContactChannels } from "@/config/nelvyon-marketing-pages";
import { nelvyonPageCtas } from "@/config/nelvyon-pa-content";
import { Container } from "@/components/pa/container";
import { PageHeader } from "@/components/pa/page-header";
import { Button } from "@/components/pa/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/pa/ui/accordion";

export function ContactFull() {
  return (
    <section className="w-full py-28 md:py-36">
      <Container className="relative flex flex-col gap-12">
        <PageHeader>Contacto</PageHeader>
        <p className="-tracking-xs max-w-3xl text-lg leading-7 font-medium text-white/75">
          {nelvyonContactChannels.intro}
        </p>

        <div className="rounded-3xl border border-white/10 bg-[#07111F] p-8 md:p-10">
          <h2 className="text-xl font-medium text-white md:text-2xl">
            {nelvyonContactChannels.antesDeContactar.title}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75">
            {nelvyonContactChannels.antesDeContactar.intro}
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {nelvyonContactChannels.antesDeContactar.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-base leading-6 text-white/80">
                <span className="text-[#0084FF]">•</span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#020817] p-6">
            <h2 className="text-lg font-medium text-white">Email</h2>
            <p className="text-sm leading-6 text-white/70">
              Canal principal para propuestas y soporte comercial.
            </p>
            <a
              href={`mailto:${nelvyonContactChannels.email}`}
              className="text-[#0084FF] text-base font-medium hover:underline"
            >
              {nelvyonContactChannels.email}
            </a>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#020817] p-6">
            <h2 className="text-lg font-medium text-white">{nelvyonContactChannels.whatsappLabel}</h2>
            <p className="text-sm leading-6 text-white/70">
              {nelvyonContactChannels.whatsappNote}
            </p>
            <a
              href={`mailto:${nelvyonContactChannels.email}?subject=Contacto%20WhatsApp`}
              className="text-[#0084FF] text-sm font-medium hover:underline"
            >
              Solicitar contacto por WhatsApp
            </a>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#020817] p-6">
            <h2 className="text-lg font-medium text-white">{nelvyonContactChannels.calendarLabel}</h2>
            <p className="text-sm leading-6 text-white/70">
              {nelvyonContactChannels.calendarNote}
            </p>
            <Link href="#formulario" className="text-[#0084FF] text-sm font-medium hover:underline">
              Ir al formulario
            </Link>
          </div>
        </div>

        <div
          id="formulario"
          className="relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#020817] p-6 md:p-10"
        >
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Formulario de contacto</h2>
          <form
            action={nelvyonContactChannels.formAction}
            method="POST"
            className="mt-8 grid grid-cols-1 gap-4"
          >
            <input
              type="text"
              name="nombre"
              required
              placeholder="Nombre *"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-base text-white outline-none focus:border-[#0084FF]/50"
            />
            <input
              type="text"
              name="empresa"
              required
              placeholder="Empresa *"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-base text-white outline-none focus:border-[#0084FF]/50"
            />
            <input
              type="email"
              name="email"
              required
              placeholder="Email *"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-base text-white outline-none focus:border-[#0084FF]/50"
            />
            <input
              type="tel"
              name="telefono"
              placeholder="Teléfono (opcional)"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-base text-white outline-none focus:border-[#0084FF]/50"
            />
            <select
              name="necesidad"
              required
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-base text-white outline-none focus:border-[#0084FF]/50"
              defaultValue=""
            >
              <option value="" disabled>
                Qué necesitas *
              </option>
              {nelvyonContactChannels.needOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              name="presupuesto"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-base text-white outline-none focus:border-[#0084FF]/50"
              defaultValue=""
            >
              <option value="">Presupuesto aproximado (opcional)</option>
              {nelvyonContactChannels.budgetOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <textarea
              name="mensaje"
              required
              placeholder="Mensaje *"
              rows={6}
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-base text-white outline-none focus:border-[#0084FF]/50"
            />
            <button
              type="submit"
              className="mt-2 inline-flex w-fit rounded-xl bg-[#0084FF] px-6 py-3 font-medium text-white hover:bg-[#0071db]"
            >
              {nelvyonPageCtas.contacto}
            </button>
          </form>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <h3 className="mb-4 text-xl font-medium text-white">FAQ breve</h3>
          <Accordion>
            {nelvyonContactChannels.faq.map((item, i) => (
              <AccordionItem key={item.question} value={`c-${i}`} className="border-white/10 py-3">
                <AccordionTrigger className="text-white">{item.question}</AccordionTrigger>
                <AccordionContent className="text-white/70">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8">
            <Button text="Solicitar acceso a SaaS" href="/contacto" />
          </div>
        </div>
      </Container>
    </section>
  );
}
