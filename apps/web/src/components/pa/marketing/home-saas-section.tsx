import Link from "next/link";

import { nelvyonPageCtas } from "@/config/nelvyon-pa-content";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { Button } from "@/components/pa/button";

const highlights = [
  "CRM y pipeline comercial",
  "Formularios y captación de leads",
  "Automatizaciones y seguimiento",
  "Email, WhatsApp y analítica",
] as const;

export function HomeSaasSection() {
  return (
    <section className="w-full border-y border-white/8 bg-[#020817]/50 py-16 md:py-24">
      <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-6">
          <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
            Plataforma NELVYON
          </span>
          <Header>NELVYON SaaS: plataforma operativa conectada</Header>
          <p className="-tracking-xs max-w-xl text-lg leading-7 text-white/75">
            Un entorno para gestionar clientes, leads, comunicación y reporting sin depender de
            varias herramientas que no comparten contexto.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" text={nelvyonPageCtas.saas} href="/contacto" />
            <Link
              href="/saas"
              className="inline-flex items-center text-sm font-medium text-[#0084FF] hover:underline"
            >
              Ver módulos y alcance →
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {highlights.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-white/10 bg-[#07111F] px-4 py-4 text-sm font-medium text-white/85"
            >
              <span className="text-[#0084FF]">→</span> {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
