import Link from "next/link";

import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";

export default function TermsPage() {
  return (
    <>
      <MarketingSubnav />
      <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <h1 className="text-2xl font-bold text-zinc-50">Términos legales</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Esta página resume el marco legal operativo de NELVYON. El texto legal definitivo (condiciones de uso,
          limitación de responsabilidad y jurisdicción) se publicará con el lanzamiento comercial oficial.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Mientras tanto, el uso de la plataforma está sujeto a las políticas acordadas en el proceso de registro y a
          la legislación aplicable en España y la Unión Europea.
        </p>
        <p className="mt-8">
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">
            ← Volver al inicio
          </Link>
        </p>
      </main>
    </>
  );
}
