import Link from "next/link";

import { nelvyonContactChannels } from "@/config/nelvyon-marketing-pages";
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#020817] p-6">
            <h2 className="text-lg font-medium text-white">Email</h2>
            <p className="text-muted-foreground text-sm leading-6">
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
            <p className="text-muted-foreground text-sm leading-6">
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
            <p className="text-muted-foreground text-sm leading-6">
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
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Solicitar información</h2>
          <p className="mt-4 text-base text-slate-300">
            Nombre, empresa y objetivo. Te respondemos para alinear servicios, plan SaaS o ambos.
          </p>
          <form
            action={nelvyonContactChannels.formAction}
            method="POST"
            className="mt-8 grid grid-cols-1 gap-4"
          >
            <input
              type="text"
              name="nombre"
              required
              placeholder="Nombre"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none focus:border-[#0084FF]/50"
            />
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none focus:border-[#0084FF]/50"
            />
            <input
              type="text"
              name="empresa"
              placeholder="Empresa"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none focus:border-[#0084FF]/50"
            />
            <input
              type="tel"
              name="telefono"
              placeholder="Teléfono (opcional, para WhatsApp)"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none focus:border-[#0084FF]/50"
            />
            <textarea
              name="mensaje"
              required
              placeholder="Objetivo principal y contexto"
              rows={6}
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none focus:border-[#0084FF]/50"
            />
            <button
              type="submit"
              className="mt-2 inline-flex w-fit rounded-xl bg-[#0084FF] px-6 py-3 font-medium text-white hover:bg-[#0071db]"
            >
              Enviar solicitud
            </button>
          </form>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <h3 className="mb-4 text-xl font-medium text-white">FAQ breve</h3>
          <Accordion>
            {nelvyonContactChannels.faq.map((item, i) => (
              <AccordionItem key={item.question} value={`c-${i}`} className="border-white/10 py-3">
                <AccordionTrigger className="text-white">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8">
            <Button text="Ver planes SaaS" href="/pricing" />
          </div>
        </div>
      </Container>
    </section>
  );
}
