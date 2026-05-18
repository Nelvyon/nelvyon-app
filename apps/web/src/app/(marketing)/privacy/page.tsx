import Link from "next/link";

import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";

export default function PrivacyPage() {
  return (
    <>
      <MarketingSubnav />
      <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <h1 className="text-2xl font-bold text-zinc-50">Privacidad</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          NELVYON trata los datos personales conforme al RGPD. Esta página es un resumen orientativo; la política de
          privacidad detallada (finalidades, base legal, plazos de conservación y derechos ARCO+) se publicará con el
          lanzamiento oficial.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Para solicitudes urgentes relacionadas con datos personales, utiliza el canal de soporte desde la app o
          escribe a través de la sección de contacto.
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
