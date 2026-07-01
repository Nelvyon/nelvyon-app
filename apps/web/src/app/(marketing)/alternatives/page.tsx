import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NELVYON vs Agencias y SaaS — Alternativa IA",
  description:
    "Compara NELVYON con agencias de marketing, Jasper, Copy.ai y herramientas tradicionales. 80+ servicios IA a una fracción del coste.",
};

const COMPARISONS = [
  {
    competitor: "Agencia de Marketing",
    them: [
      "3.000–15.000€/mes",
      "Tiempo de respuesta: días",
      "Equipo humano limitado",
      "Sin disponibilidad 24/7",
    ],
    us: ["Desde 47€/mes", "Resultados en minutos", "80+ servicios IA", "Disponible 24/7/365"],
  },
  {
    competitor: "Jasper AI",
    them: ["Solo copywriting", "Sin gestión de ads", "Sin SEO técnico", "Sin email marketing"],
    us: [
      "Copy + 80 servicios más",
      "Ads management completo",
      "SEO técnico incluido",
      "Email marketing automatizado",
    ],
  },
  {
    competitor: "Suite CRM tradicional",
    them: [
      "Planes elevados en funciones avanzadas",
      "Configuración compleja",
      "Requiere equipo dedicado",
      "Curva de aprendizaje alta",
    ],
    us: ["Desde 47€/mes", "Funciona desde el día 1", "Sin equipo necesario", "Plantillas oficiales Nelvyon"],
  },
] as const;

export default function AlternativesPage() {
  return (
    <main className="min-h-screen bg-[#080808] px-4 py-24 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "NELVYON",
            applicationCategory: "BusinessApplication",
            description: "Plataforma de marketing IA autónomo con 80+ servicios automatizados",
            offers: {
              "@type": "Offer",
              price: "47",
              priceCurrency: "EUR",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                billingDuration: "P1M",
              },
            },
            operatingSystem: "Web",
          }),
        }}
      />
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-black md:text-5xl">
            NELVYON vs <span className="text-indigo-400">el resto</span>
          </h1>
          <p className="text-lg text-zinc-400">
            Por qué los negocios eligen NELVYON sobre agencias y herramientas tradicionales
          </p>
        </div>
        <div className="space-y-8">
          {COMPARISONS.map(({ competitor, them, us }) => (
            <div key={competitor} className="overflow-hidden rounded-2xl border border-zinc-800">
              <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
                <h2 className="text-lg font-bold">NELVYON vs {competitor}</h2>
              </div>
              <div className="grid grid-cols-2">
                <div className="border-r border-zinc-800 p-6">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {competitor}
                  </p>
                  <ul className="space-y-2">
                    {them.map((t) => (
                      <li key={t} className="flex gap-2 text-sm text-zinc-500">
                        <span className="shrink-0 text-red-500">✗</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    NELVYON
                  </p>
                  <ul className="space-y-2">
                    {us.map((u) => (
                      <li key={u} className="flex gap-2 text-sm text-zinc-300">
                        <span className="shrink-0 text-emerald-400">✓</span>
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center">
          <Link
            href="/register"
            className="inline-block rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Empieza con NELVYON →
          </Link>
        </div>
      </div>
    </main>
  );
}
