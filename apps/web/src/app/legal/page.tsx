import type { Metadata } from "next";
import Link from "next/link";

import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";

export const metadata: Metadata = {
  title: "Documentación legal",
  description:
    "Políticas legales de NELVYON: privacidad, términos, reembolsos, uso aceptable, DPA y divulgación de IA.",
};

const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Política de privacidad" },
  { href: "/legal/terms", label: "Términos de servicio" },
  { href: "/legal/refund-policy", label: "Política de reembolso" },
  { href: "/legal/acceptable-use", label: "Política de uso aceptable (AUP)" },
  { href: "/legal/dpa", label: "Acuerdo de tratamiento de datos (DPA)" },
  { href: "/legal/ai-disclosure", label: "Divulgación de inteligencia artificial (EU AI Act)" },
] as const;

export default function LegalIndexPage() {
  return (
    <>
      <MarketingSubnav />
      <main className="min-h-screen bg-[#080808] px-4 py-12 text-zinc-100 md:px-6">
        <div className="mx-auto max-w-[800px]">
          <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-zinc-300">
              Inicio
            </Link>
            <span className="mx-1">/</span>
            <span className="text-zinc-300">Legal</span>
          </nav>

          <h1 className="mt-8 text-3xl font-bold text-zinc-50">Documentación legal</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Consulta las políticas que rigen el uso de NELVYON. Si tienes dudas, escribe a{" "}
            <a href="mailto:legal@nelvyon.com" className="text-indigo-400 hover:text-indigo-300">
              legal@nelvyon.com
            </a>
            .
          </p>

          <ul className="mt-10 space-y-3 border-t border-zinc-800 pt-8">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-base font-medium text-indigo-400 hover:text-indigo-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
