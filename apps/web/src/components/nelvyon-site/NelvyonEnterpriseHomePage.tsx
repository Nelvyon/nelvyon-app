"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Bot,
  Layers,
  Package,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

import { NELVYON } from "./brand";
import { FadeUp } from "./FadeUp";
import { NelvyonHomePage } from "./NelvyonHomePage";
import { NelvyonShell } from "./NelvyonShell";
import {
  NelvyonEnterpriseBadge,
  NelvyonEnterpriseHeading,
  NelvyonProductFrame,
} from "@/components/nelvyon-enterprise";

const ElectricHeroCanvas = dynamic(
  () => import("./ElectricHeroCanvas").then((m) => ({ default: m.ElectricHeroCanvas })),
  { ssr: false },
);

const PLATFORM_LAYERS = [
  {
    icon: Package,
    title: "Packs autónomos",
    desc: "Crecimiento local, ecommerce y SaaS B2B con landing, SEO, ads y email listos en horas — no en semanas.",
    href: "/packs",
    cta: "Ver packs",
  },
  {
    icon: Bot,
    title: "OS de marketing",
    desc: "Motores internos de SEO, ads, funnels y contenido que ejecutan campañas 24/7 con supervisión humana opcional.",
    href: "/login",
    cta: "Acceder al OS",
  },
] as const;

const TRUST_SIGNALS = [
  "Infraestructura lista para escalar",
  "Seguridad y cumplimiento RGPD",
  "Multi-workspace y roles",
  "SLA enterprise en planes Elite",
] as const;

function EnterpriseHero() {
  return (
    <section className="relative min-h-[78vh] overflow-hidden px-4 pb-16 pt-12 md:min-h-[82vh] md:px-6 md:pb-24 md:pt-20">
      <ElectricHeroCanvas />
      <div aria-hidden className="nv-enterprise-grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto max-w-5xl text-center"
        initial={{ opacity: 0, y: 28 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <NelvyonEnterpriseBadge className="mb-8">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Plataforma enterprise
        </NelvyonEnterpriseBadge>
        <NelvyonEnterpriseHeading as="h1" variant="display" className="text-white">
          El sistema operativo de marketing
          <span className="nv-enterprise-gradient-text mt-2 block">que ejecuta por ti</span>
        </NelvyonEnterpriseHeading>
        <NelvyonEnterpriseHeading as="p" variant="subtitle" className="mx-auto mt-8 max-w-2xl text-zinc-400">
          {NELVYON.tagline}. Packs autónomos para el cliente final y un OS interno que orquesta SEO, paid media,
          funnels y entregables — una sola marca, nivel empresa.
        </NelvyonEnterpriseHeading>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-[#0066FF] px-10 py-4 text-base font-semibold text-white shadow-[0_0_48px_rgba(0,102,255,0.4)] transition hover:bg-[#0052cc] sm:w-auto"
            href="/register"
          >
            Empieza gratis
          </Link>
          <Link
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-white/15 px-10 py-4 text-base font-semibold text-white transition hover:border-[#0066FF]/50 sm:w-auto"
            href="/login"
          >
            Acceder al panel
          </Link>
        </div>
      </motion.div>
      <NelvyonProductFrame />
    </section>
  );
}

function PlatformLayersSection() {
  return (
    <section className="border-t border-white/10 px-4 py-20 md:px-6 md:py-28">
      <FadeUp className="mx-auto max-w-3xl text-center">
        <p className="nv-enterprise-eyebrow mb-4">Arquitectura dual</p>
        <NelvyonEnterpriseHeading as="h2" variant="title" className="text-white">
          SaaS para el cliente. OS para escalar.
        </NelvyonEnterpriseHeading>
        <p className="mt-4 text-zinc-500">
          Dos capas separadas, una experiencia premium: lo que ve tu cliente no se mezcla con los motores internos que
          Nelvyon opera.
        </p>
      </FadeUp>
      <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
        {PLATFORM_LAYERS.map((layer, i) => {
          const Icon = layer.icon;
          return (
            <FadeUp delay={i * 0.08} key={layer.title}>
              <div className="nv-enterprise-glass group flex h-full flex-col rounded-2xl p-8 transition hover:border-[#0066FF]/40">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0066FF]/15 text-[#0066FF] transition group-hover:shadow-[0_0_32px_rgba(0,102,255,0.25)]">
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="text-xl font-semibold text-white">{layer.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{layer.desc}</p>
                <Link
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#66a3ff] hover:text-white"
                  href={layer.href}
                >
                  {layer.cta}
                  <Zap className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </FadeUp>
          );
        })}
      </div>
      <FadeUp className="mx-auto mt-12 max-w-4xl">
        <div className="nv-enterprise-glass flex flex-col items-center justify-between gap-6 rounded-2xl p-6 md:flex-row md:p-8">
          <div className="flex items-start gap-4 text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#0066FF]">
              <Layers className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-white">Una biblioteca, miles de combinaciones</p>
              <p className="mt-1 text-sm text-zinc-500">
                Landings, emails, funnels y creatividades se generan desde plantillas internas de nivel enterprise —
                cada negocio recibe un look distinto.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <Workflow className="h-4 w-4 text-[#0066FF]" aria-hidden />
            Packs → OS → entregables en portal
          </div>
        </div>
      </FadeUp>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-white/10 bg-black/40 px-4 py-10 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {TRUST_SIGNALS.map((signal) => (
          <div className="flex items-center gap-2 text-sm text-zinc-400" key={signal}>
            <Shield className="h-4 w-4 shrink-0 text-[#0066FF]" aria-hidden />
            {signal}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Enterprise marketing home — hero + platform story + full Nelvyon home sections. */
export function NelvyonEnterpriseHomePage() {
  return (
    <NelvyonShell>
      <EnterpriseHero />
      <TrustBar />
      <PlatformLayersSection />
      <NelvyonHomePageSections />
    </NelvyonShell>
  );
}

/** Rest of home (services, pricing, FAQ) without duplicate shell/hero. */
function NelvyonHomePageSections() {
  return <NelvyonHomePage embedded />;
}
