import Link from "next/link";

import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";
import { EarlyAdopterBadge } from "@/components/marketing/EarlyAdopterBadge";
import { EarlyAdopterHeroCountdown } from "@/components/marketing/EarlyAdopterHeroCountdown";
import { LandingEarlyAdopterPricing } from "@/components/marketing/LandingEarlyAdopterPricing";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://nelvyon.com";
const canonicalBase = BASE_URL.replace(/\/$/, "");

const nelvyonMarketingDescription =
  "Plataforma de marketing con inteligencia artificial. Automatiza SEO, ads, contenido y más.";

const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NELVYON",
  applicationCategory: "BusinessApplication",
  description: nelvyonMarketingDescription,
  url: canonicalBase,
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "47",
    highPrice: "497",
    priceCurrency: "EUR",
  },
  operatingSystem: "Web",
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NELVYON",
  url: canonicalBase,
  email: "hola@nelvyon.com",
};

const valueCards = [
  {
    icon: "◈",
    title: "SEO & Contenido",
    body: "Posicionamiento orgánico, artículos, keywords y estrategia de contenido generados por IA",
  },
  {
    icon: "◉",
    title: "Ads Management",
    body: "Campañas en Google, Meta y TikTok optimizadas automáticamente para máximo ROAS",
  },
  {
    icon: "◎",
    title: "Email Marketing",
    body: "Secuencias, newsletters y flujos de nurturing personalizados para cada cliente",
  },
  {
    icon: "◆",
    title: "Branding IA",
    body: "Identidad visual, copy y posicionamiento de marca consistente y profesional",
  },
  {
    icon: "◇",
    title: "Video & Reels",
    body: "Guiones virales, calendarios de contenido y briefs de producción listos para publicar",
  },
  {
    icon: "◉",
    title: "Analytics & CRO",
    body: "Análisis de datos, optimización de conversión y reportes automáticos",
  },
] as const;

const testimonials = [
  {
    quote: "NELVYON reemplazó a nuestra agencia de marketing. Ahorramos 3.000€/mes.",
    author: "Carlos M., CEO SaaS B2B",
  },
  {
    quote: "El SEO automatizado nos llevó al top 3 en 6 semanas.",
    author: "Laura P., eCommerce",
  },
  {
    quote: "80 servicios de IA por menos de lo que pagaba a un freelancer.",
    author: "Iván R., Startup Fintech",
  },
] as const;

export default function MarketingHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        suppressHydrationWarning
      />
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-800/50 bg-[#080808]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-lg font-black tracking-tight text-indigo-500">
            NELVYON
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <Link href="/#servicios" className="transition-colors hover:text-zinc-100">
              Servicios
            </Link>
            <Link href="/#pricing" className="transition-colors hover:text-zinc-100">
              Pricing
            </Link>
            <Link href="/auth/login" className="transition-colors hover:text-zinc-100">
              Acceder
            </Link>
          </div>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Empieza gratis →
          </Link>
        </div>
      </nav>

      <section className="px-4 pb-24 pt-28 text-center md:px-6 md:pb-32 md:pt-36 lg:px-8 lg:pb-40 lg:pt-44">
        <div className="mx-auto inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 md:text-sm">
          Lanzamiento · 19 mayo 2026
        </div>
        <EarlyAdopterBadge className="mx-auto mt-6 max-w-2xl" showCountdown={false} />
        <EarlyAdopterHeroCountdown />
        <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-black leading-[1.05] tracking-tight text-zinc-50 md:text-7xl">
          El equipo de marketing IA
          <br /> que trabaja por ti
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl">
          NELVYON ejecuta SEO, contenido, ads, email, branding y 80+ servicios más de forma autónoma. Sin equipo. Sin
          agencia. Solo resultados.
        </p>
        <div className="mx-auto mt-10 flex max-w-lg flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/register"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Empieza gratis →
          </Link>
          <Link
            href="/#servicios"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80"
          >
            Ver servicios
          </Link>
        </div>
        <p className="mx-auto mt-14 max-w-3xl text-xs text-zinc-500 md:text-sm">
          80+ servicios IA · 195 países · Desde 47€/mes · Lanzamiento 19 mayo
        </p>
      </section>

      <section id="servicios" className="scroll-mt-20 bg-[#0d0d0d] px-4 py-20 md:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
            Todo lo que necesita tu negocio, automatizado
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {valueCards.map((c) => (
              <article
                key={c.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-indigo-500/50"
              >
                <div className="mb-3 text-2xl text-indigo-400">{c.icon}</div>
                <h3 className="text-lg font-semibold text-zinc-100">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-zinc-50 md:text-4xl">Cómo funciona</h2>
          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-[2.75rem] hidden h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent md:block"
              aria-hidden
            />
            {[
              {
                n: "1",
                title: "Describes tu negocio",
                desc: "Le dices a NELVYON qué necesitas",
              },
              {
                n: "2",
                title: "Los agentes ejecutan",
                desc: "80+ agentes trabajan en paralelo",
              },
              {
                n: "3",
                title: "Recibes resultados",
                desc: "Entrega automática, sin supervisión",
              },
            ].map((step) => (
              <div key={step.n} className="relative z-10 flex flex-col items-center text-center">
                <span className="text-5xl font-black text-indigo-500 md:text-6xl">{step.n}</span>
                <h3 className="mt-4 text-lg font-semibold text-zinc-100">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 bg-[#0d0d0d] px-4 py-20 md:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-zinc-50 md:text-4xl">Planes simples, sin sorpresas</h2>
          <LandingEarlyAdopterPricing />
          <p className="mt-8 text-center text-xs text-zinc-500 md:text-sm">
            Facturado mensualmente · Cancela cuando quieras · IVA incluido
          </p>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-zinc-50 md:text-3xl">
            Confiado por fundadores y agencias en toda Europa
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote
                key={t.author}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-left"
              >
                <p className="text-sm leading-relaxed text-zinc-300">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-xs font-medium text-zinc-500">{t.author}</footer>
              </blockquote>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-zinc-500">
            10x más rápido · 90% más barato · 0 supervisión requerida
          </p>
        </div>
      </section>

      <section className="px-4 py-24 md:px-6 md:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-zinc-950/80 to-[#080808] px-6 py-16 text-center md:px-12 md:py-20">
          <h2 className="text-2xl font-bold text-zinc-50 md:text-3xl">
            Empieza hoy. Los primeros 100 clientes tienen precio bloqueado.
          </h2>
          <Link
            href="/register"
            className="mx-auto mt-8 inline-flex min-h-[52px] items-center justify-center rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Reserva tu acceso early →
          </Link>
          <p className="mt-4 text-xs text-zinc-500">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-4 py-12 md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-black text-indigo-500">NELVYON</p>
            <p className="mt-1 text-sm text-zinc-500">Marketing IA autónomo</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
            <Link href="/#servicios" className="hover:text-zinc-200">
              Servicios
            </Link>
            <Link href="/#pricing" className="hover:text-zinc-200">
              Pricing
            </Link>
            <Link href="/legal" className="hover:text-zinc-200">
              Legal
            </Link>
            <Link href="/terms" className="hover:text-zinc-200">
              Términos
            </Link>
            <Link href="/privacy" className="hover:text-zinc-200">
              Privacidad
            </Link>
            <Link href="/legal/refund-policy" className="hover:text-zinc-200">
              Política de reembolso
            </Link>
            <Link href="/legal/acceptable-use" className="hover:text-zinc-200">
              Uso aceptable
            </Link>
            <Link href="/legal/dpa" className="hover:text-zinc-200">
              DPA
            </Link>
            <Link href="/legal/ai-disclosure" className="hover:text-zinc-200">
              Divulgación IA
            </Link>
            <CookiePreferencesButton />
            <a href="mailto:hola@nelvyon.com" className="hover:text-zinc-200">
              Contacto
            </a>
          </nav>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-center text-xs text-zinc-600">
          © 2026 NELVYON. Todos los derechos reservados.
        </p>
      </footer>
    </>
  );
}
