import type { Metadata } from "next";
import { Container } from "@/components/pa/container";
import { PageHeader } from "@/components/pa/page-header";
import { nelvyonContact } from "@/config/nelvyon-pa-content";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contacto | NELVYON",
  description: "Contacta con NELVYON para estructurar marketing, ventas, automatización y reporting.",
};

export default function ContactoPage() {
  return (
    <section className="w-full py-28 md:py-36">
      <Container className="relative flex flex-col gap-10">
        <PageHeader>Contacto</PageHeader>
        <div className="relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#020817] p-6 md:p-10">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Solicitar informacion</h1>
          <p className="mt-4 text-base text-slate-300">
            Cuentanos tu contexto y objetivos. Te responderemos en breve para definir el siguiente paso.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Email directo: <a className="underline" href={`mailto:${nelvyonContact.email}`}>{nelvyonContact.email}</a>
          </p>
          <form action={nelvyonContact.formAction} method="POST" className="mt-8 grid grid-cols-1 gap-4">
            <input
              type="text"
              name="nombre"
              required
              placeholder="Nombre"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none"
            />
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none"
            />
            <input
              type="text"
              name="empresa"
              placeholder="Empresa"
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none"
            />
            <textarea
              name="mensaje"
              required
              placeholder="Describe tu objetivo principal"
              rows={6}
              className="rounded-xl border border-white/10 bg-[#05070D] px-4 py-3 text-white outline-none"
            />
            <button
              type="submit"
              className="mt-2 inline-flex w-fit rounded-xl bg-[#0084FF] px-6 py-3 font-medium text-white hover:bg-[#0071db]"
            >
              Enviar solicitud
            </button>
          </form>
        </div>
      </Container>
    </section>
  );
}
