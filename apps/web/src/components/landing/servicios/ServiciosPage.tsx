"use client";

import Link from "next/link";

import { NeuralNetwork } from "@/components/ui/NeuralNetwork";
import { ALL_SERVICES } from "../agencyContent";
import { FadeIn } from "../FadeIn";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { BRAND } from "../shared";
import { PrimaryButton } from "../ui";

type SlugGradient = {
  from: string;
  to: string;
  accent?: string;
};

const GRADIENTS: Record<string, SlugGradient> = {
  seo: { from: "#1a1a2e", to: "#16213e" },
  "google-ads": { from: "#1967D2", to: "#4285F4" },
  "meta-ads": { from: "#0D5FBF", to: "#1877F2" },
  "tiktok-ads": { from: "#010101", to: "#333333", accent: "#00f2ea" },
  email: { from: "#D4380D", to: "#FF6B35" },
  automatizacion: { from: "#4F46E5", to: "#7C3AED" },
  webs: { from: "#059669", to: "#10B981" },
  ecommerce: { from: "#0E7490", to: "#06B6D4" },
  branding: { from: "#9333EA", to: "#C026D3" },
  social: { from: "#E11D48", to: "#F43F5E" },
  "contenido-ia": { from: "#0066FF", to: "#00CFFF" },
  chatbot: { from: "#0F172A", to: "#1E293B", accent: "#0066FF" },
  "sms-whatsapp": { from: "#15803D", to: "#22C55E" },
  crm: { from: "#92400E", to: "#F59E0B" },
  "video-ia": { from: "#7C2D12", to: "#EA580C" },
  "imagen-ia": { from: "#6B21A8", to: "#A855F7" },
  "copy-ia": { from: "#1E3A5F", to: "#2563EB" },
  analytics: { from: "#134E4A", to: "#0D9488" },
  reputacion: { from: "#1C1917", to: "#44403C", accent: "#F59E0B" },
  influencer: { from: "#831843", to: "#EC4899" },
  pr: { from: "#1E1B4B", to: "#4338CA" },
  presupuestos: { from: "#064E3B", to: "#34D399" },
  snapchat: { from: "#713F12", to: "#FBBF24" },
  linkedin: { from: "#0A66C2", to: "#0E86D4" },
  auditoria: { from: "#111827", to: "#374151", accent: "#00CFFF" },
};

function ServiceCard({ service }: { service: (typeof ALL_SERVICES)[number] }) {
  const grad = GRADIENTS[service.slug] ?? { from: "#0066FF", to: "#0044CC" };
  const Icon = service.icon;
  return (
    <div
      className="group flex min-h-[220px] flex-col justify-between rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)`,
        boxShadow: `0 4px 20px ${grad.from}55`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${grad.from}99`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${grad.from}55`;
      }}
    >
      <div>
        <Icon
          className="mb-4 h-[52px] w-[52px] text-white"
          style={grad.accent ? { filter: `drop-shadow(0 0 8px ${grad.accent})` } : undefined}
        />
        <h3 className="text-xl font-extrabold text-white">{service.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{service.desc}</p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-base font-bold text-white">Desde €{service.from}/mes</span>
        <Link
          className="shrink-0 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
          href="/contacto"
        >
          Solicitar este servicio →
        </Link>
      </div>
    </div>
  );
}

export function ServiciosPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: BRAND.white,
        color: BRAND.textOnWhite,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <MarketingNavbar active="/servicios" />
      <main>
        {/* Hero oscuro con red neuronal */}
        <section
          className="relative -mt-20 overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 45%, #020818 0%, #000000 72%)`,
          }}
        >
          <NeuralNetwork />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center md:px-6">
            <FadeIn>
              <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
                25 Servicios de Marketing Digital
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
                Todo lo que tu negocio necesita para crecer online — ejecutado por IA, con calidad de agencia
                top mundial.
              </p>
              <div className="mt-10">
                <PrimaryButton href="/contacto">Solicitar propuesta</PrimaryButton>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Grid 2 columnas */}
        <section className="bg-[#F9FAFB] py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <div className="grid gap-5 sm:grid-cols-2">
                {ALL_SERVICES.map((s) => (
                  <ServiceCard key={s.slug} service={s} />
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="bg-white py-12 text-center md:py-16">
          <div className="mx-auto max-w-2xl px-4">
            <p className="text-sm text-[#6B7280]">
              Los resultados de marketing varían según sector, inversión y competencia. No garantizamos cifras
              concretas; trabajamos con KPIs acordados contigo.
            </p>
            <div className="mt-8">
              <PrimaryButton href="/contacto">Hablar con el equipo →</PrimaryButton>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
