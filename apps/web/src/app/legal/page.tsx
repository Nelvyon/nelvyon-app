import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/LegalPage";
import { siteBrand } from "@/features/public-web";

export const metadata: Metadata = {
  title: "Documentación legal | NELVYON",
  description:
    "Privacidad, términos, cookies, aviso legal, DPA, subprocesadores y políticas asociadas de NELVYON.",
  alternates: { canonical: "/legal" },
};

const LEGAL_LINKS = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/cookies", label: "Política de cookies" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/legal/dpa", label: "Acuerdo de tratamiento de datos (DPA)" },
  { href: "/legal/subprocessors", label: "Subprocesadores" },
  { href: "/legal/refund-policy", label: "Política de reembolso" },
  { href: "/legal/acceptable-use", label: "Política de uso aceptable (AUP)" },
  { href: "/legal/ai-disclosure", label: "Divulgación de inteligencia artificial" },
  { href: "/seguridad", label: "Seguridad" },
  { href: "/status", label: "Estado del servicio" },
] as const;

export default function LegalIndexPage() {
  return (
    <LegalPage title="Documentación legal" lastUpdated="1 de agosto de 2026">
      <p>
        Consulte las políticas que rigen el uso de {siteBrand.name}. Para dudas:{" "}
        <a href={`mailto:${siteBrand.contactEmail}`}>{siteBrand.contactEmail}</a>.
      </p>
      <ul className="!list-none !pl-0 space-y-3 border-t border-[var(--nv-border)] pt-6">
        {LEGAL_LINKS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-base font-medium !no-underline hover:!underline">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
