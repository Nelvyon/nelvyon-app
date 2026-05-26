"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { NeuralNetwork } from "@/components/ui/NeuralNetwork";
import { ALL_SERVICES, type ServiceItem } from "../agencyContent";
import { FadeIn } from "../FadeIn";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { BRAND } from "../shared";
import { PrimaryButton } from "../ui";

type FilterId = "todos" | "seo" | "publicidad" | "contenido" | "web" | "automatizacion";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "seo", label: "SEO" },
  { id: "publicidad", label: "Publicidad" },
  { id: "contenido", label: "Contenido" },
  { id: "web", label: "Web" },
  { id: "automatizacion", label: "Automatización" },
];

const SLUG_CATEGORY: Record<string, FilterId> = {
  seo: "seo",
  "google-ads": "publicidad",
  "meta-ads": "publicidad",
  "tiktok-ads": "publicidad",
  snapchat: "publicidad",
  linkedin: "publicidad",
  influencer: "publicidad",
  email: "contenido",
  "contenido-ia": "contenido",
  "copy-ia": "contenido",
  "video-ia": "contenido",
  "imagen-ia": "contenido",
  social: "contenido",
  pr: "contenido",
  webs: "web",
  ecommerce: "web",
  branding: "web",
  automatizacion: "automatizacion",
  chatbot: "automatizacion",
  crm: "automatizacion",
  "sms-whatsapp": "automatizacion",
  analytics: "automatizacion",
  presupuestos: "automatizacion",
  reputacion: "automatizacion",
  auditoria: "automatizacion",
};

function ServiceCard({
  service,
  onSelect,
  centered,
}: {
  service: ServiceItem;
  onSelect: () => void;
  centered?: boolean;
}) {
  const Icon = service.icon;
  return (
    <button
      className={`flex min-h-[180px] w-full flex-col rounded-2xl border p-6 text-left transition duration-200 hover:scale-[1.02] hover:border-[#0066FF] hover:shadow-[0_8px_32px_rgba(0,102,255,0.2)] ${centered ? "max-w-md" : ""}`}
      onClick={onSelect}
      style={{ backgroundColor: BRAND.bgSection, borderColor: BRAND.cardBorder }}
      type="button"
    >
      <Icon className="h-10 w-10 text-[#00CFFF]" />
      <h3 className="mt-4 text-lg font-extrabold text-white">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm text-[#94A3B8]">{service.desc}</p>
      <p className="mt-4 text-sm font-bold text-white">Desde €{service.from}/mes</p>
    </button>
  );
}

export function ServiciosPage() {
  const [filter, setFilter] = useState<FilterId>("todos");
  const [selected, setSelected] = useState<ServiceItem | null>(null);

  const filtered = useMemo(() => {
    if (filter === "todos") return [...ALL_SERVICES];
    return ALL_SERVICES.filter((s) => SLUG_CATEGORY[s.slug] === filter);
  }, [filter]);

  const lastIsAuditoria =
    filter === "todos" && filtered.length === 25 && filtered[filtered.length - 1]?.slug === "auditoria";

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BRAND.bg, color: BRAND.textPrimary, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <MarketingNavbar active="/servicios" />
      <main>
        <section
          className="relative -mt-20 overflow-hidden pt-28 pb-16 md:pt-32 md:pb-20"
          style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, #020818 0%, #000000 72%)" }}
        >
          <NeuralNetwork />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center md:px-6">
            <FadeIn>
              <h1 className="text-4xl font-extrabold text-white md:text-5xl">25 Servicios de Marketing Digital</h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-[#94A3B8]">
                Cada servicio ejecutado por IA entrenada específicamente. Sin subcontratas. Sin excusas.
              </p>
              <div className="mt-10">
                <PrimaryButton href="/contacto">Solicitar propuesta</PrimaryButton>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-12 md:py-16" style={{ backgroundColor: BRAND.bg }}>
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-wrap justify-center gap-2">
              {FILTERS.map((f) => (
                <button
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    filter === f.id ? "text-white" : "text-[#94A3B8]"
                  }`}
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={
                    filter === f.id
                      ? { backgroundColor: BRAND.blue }
                      : { border: `1px solid ${BRAND.cardBorder}`, backgroundColor: BRAND.bgSection }
                  }
                  type="button"
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s, i) => {
                const isLastCentered = lastIsAuditoria && i === filtered.length - 1;
                return (
                  <div
                    className={isLastCentered ? "col-span-full flex justify-center" : ""}
                    key={s.slug}
                  >
                    <ServiceCard centered={isLastCentered} onSelect={() => setSelected(s)} service={s} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <aside
            className="flex h-full w-full max-w-md flex-col border-l p-8 shadow-2xl"
            style={{ backgroundColor: BRAND.bgSection, borderColor: BRAND.cardBorder }}
          >
            <button
              aria-label="Cerrar"
              className="ml-auto rounded-lg p-2 text-[#94A3B8] hover:text-white"
              onClick={() => setSelected(null)}
              type="button"
            >
              <X className="h-6 w-6" />
            </button>
            <selected.icon className="mt-4 h-12 w-12 text-[#00CFFF]" />
            <h2 className="mt-4 text-2xl font-extrabold text-white">{selected.name}</h2>
            <p className="mt-4 leading-relaxed text-[#94A3B8]">{selected.desc}</p>
            <p className="mt-6 text-sm text-white">
              <strong>Qué incluye:</strong> estrategia, ejecución con IA, reporting mensual y soporte en español.
            </p>
            <p className="mt-4 text-lg font-bold text-white">Desde €{selected.from}/mes</p>
            <Link
              className="nelvyon-cta-btn mt-8 block rounded-xl py-4 text-center font-semibold text-white"
              href="/contacto"
            >
              Solicitar este servicio →
            </Link>
          </aside>
        </div>
      ) : null}

      <LandingFooter />
    </div>
  );
}
