"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EarlyAdopterBadge } from "@/components/marketing/EarlyAdopterBadge";

const EARLY_ADOPTER_PRICES: Record<string, number> = {
  starter: 28,
  pro: 118,
  agency: 298,
};

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 47,
    description: "Para fundadores y solopreneurs",
    color: "#6366f1",
    features: [
      "500 llamadas/mes a agentes IA",
      "20+ servicios incluidos",
      "SEO, contenido y email automatizados",
      "Dashboard de resultados",
      "Soporte por email",
    ],
    notIncluded: ["Ads management", "Video & Reels IA", "API keys propias", "Acceso prioritario"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 197,
    description: "Para equipos y negocios en crecimiento",
    color: "#6366f1",
    popular: true,
    features: [
      "2.000 llamadas/mes a agentes IA",
      "60+ servicios incluidos",
      "Todo Starter +",
      "Ads management IA (Google, Meta, TikTok)",
      "Video & Reels IA",
      "API keys propias",
      "Historial completo de resultados",
      "Soporte prioritario",
    ],
    notIncluded: ["White-label", "Gestor de cuenta dedicado"],
  },
  {
    id: "agency",
    name: "Agency",
    price: 497,
    description: "Para agencias y empresas",
    color: "#6366f1",
    features: [
      "10.000 llamadas/mes a agentes IA",
      "80+ servicios incluidos",
      "Todo Pro +",
      "White-label disponible",
      "Gestor de cuenta dedicado",
      "Integraciones personalizadas",
      "SLA garantizado",
      "Acceso early a nuevos agentes",
    ],
    notIncluded: [] as const,
  },
] as const;

const COMPARISON_ROWS = [
  { feature: "Llamadas/mes a agentes IA", starter: "500", pro: "2.000", agency: "10.000" },
  { feature: "Servicios incluidos", starter: "20+", pro: "60+", agency: "80+" },
  { feature: "SEO, contenido y email", starter: "✓", pro: "✓", agency: "✓" },
  { feature: "Dashboard de resultados", starter: "✓", pro: "✓", agency: "✓" },
  { feature: "Ads management IA", starter: "—", pro: "✓", agency: "✓" },
  { feature: "Video & Reels IA", starter: "—", pro: "✓", agency: "✓" },
  { feature: "API keys propias", starter: "—", pro: "✓", agency: "✓" },
  { feature: "Historial completo", starter: "—", pro: "✓", agency: "✓" },
  { feature: "Soporte", starter: "Email", pro: "Prioritario", agency: "Prioritario + dedicado" },
  { feature: "White-label", starter: "—", pro: "—", agency: "✓" },
  { feature: "Integraciones personalizadas", starter: "—", pro: "—", agency: "✓" },
  { feature: "SLA garantizado", starter: "—", pro: "—", agency: "✓" },
  { feature: "Early access a nuevos agentes", starter: "—", pro: "—", agency: "✓" },
] as const;

type EarlyAdopterStatus = {
  active: boolean;
  slotsLeft: number;
  expiresAt: string;
  discountPct: number;
};

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [eaStatus, setEaStatus] = useState<EarlyAdopterStatus | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    fetch("/api/user/subscription", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { plan?: string } | null) => {
        if (d?.plan) setCurrentPlan(d.plan);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/early-adopter/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EarlyAdopterStatus | null) => {
        if (d) setEaStatus(d);
      })
      .catch(() => {});
  }, []);

  async function handleCheckout(planId: string) {
    setCheckoutBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (res.status === 401) {
        window.location.href = eaStatus?.active ? "/register?redirect=/pricing&earlyAdopter=1" : "/register";
        return;
      }
      if (!res.ok) {
        console.error("[pricing] checkout failed", res.status);
        window.location.href = "/register?redirect=/pricing";
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
    } catch (e) {
      console.error("[pricing] checkout error", e);
    } finally {
      setCheckoutBusy(false);
    }
  }

  function displayPrice(planId: string, basePrice: number): number {
    if (eaStatus?.active && planId in EARLY_ADOPTER_PRICES) {
      return EARLY_ADOPTER_PRICES[planId] ?? basePrice;
    }
    return basePrice;
  }

  return (
    <main className="min-h-screen bg-[#080808] text-zinc-100">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-800/50 bg-[#080808]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-xl font-black tracking-tight text-indigo-500">
            NELVYON
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Empieza gratis →
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 md:px-6">
        <div className="mb-16 text-center">
          <EarlyAdopterBadge className="mb-8" />
          <h1 className="mb-4 text-4xl font-black md:text-6xl">
            Planes simples, <span className="text-indigo-400">sin sorpresas</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-zinc-400">
            Facturado mensualmente. Cancela cuando quieras. IVA incluido.
          </p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isPopular = "popular" in plan && plan.popular;
            const showEarly = eaStatus?.active === true;
            const price = displayPrice(plan.id, plan.price);
            const ctaLabel =
              isCurrent
                ? "Plan actual"
                : showEarly
                  ? "Conseguir Early Adopter →"
                  : `Empezar con ${plan.name} →`;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  isPopular ? "border-indigo-500 bg-indigo-950/20" : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                      Más popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="mb-1 text-xl font-bold">{plan.name}</h2>
                  <p className="mb-4 text-sm text-zinc-500">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    {showEarly ? (
                      <span className="text-lg text-zinc-500 line-through">{plan.price}€</span>
                    ) : null}
                    <span className="text-4xl font-black">{price}€</span>
                    <span className="text-sm text-zinc-500">/mes</span>
                  </div>
                  {showEarly ? (
                    <p className="mt-1 text-xs text-indigo-300">40% descuento permanente · Early Adopter</p>
                  ) : null}
                </div>
                <ul className="mb-8 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                  {"notIncluded" in plan &&
                    plan.notIncluded.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                        <span className="mt-0.5 shrink-0">✗</span>
                        {f}
                      </li>
                    ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void handleCheckout(plan.id)}
                  disabled={isCurrent || checkoutBusy}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isPopular
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                  }`}
                >
                  {ctaLabel}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mb-16">
          <h2 className="mb-6 text-center text-2xl font-bold">Comparativa de planes</h2>
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                  <th className="px-4 py-3 font-semibold">Funcionalidad</th>
                  <th className="px-4 py-3 font-semibold">Starter</th>
                  <th className="px-4 py-3 font-semibold text-indigo-300">Pro</th>
                  <th className="px-4 py-3 font-semibold">Agency</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-zinc-800/80 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">{row.feature}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.starter}</td>
                    <td className="px-4 py-3 text-zinc-200">{row.pro}</td>
                    <td className="px-4 py-3 text-zinc-200">{row.agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {[
              {
                q: "¿Puedo cancelar en cualquier momento?",
                a: "Sí. Sin permanencia ni penalizaciones. Mantienes el acceso hasta el fin del período pagado.",
              },
              {
                q: "¿Qué pasa si supero el límite de llamadas?",
                a: "Los agentes dejan de ejecutarse hasta el siguiente mes. Puedes actualizar tu plan en cualquier momento.",
              },
              {
                q: "¿Está incluido el IVA?",
                a: "Sí. Stripe calcula y recauda el IVA/TVA según la ubicación del cliente cuando corresponde.",
              },
              {
                q: "¿Puedo usar mis propias API keys?",
                a: "Sí, en los planes Pro y Agency puedes conectar tus keys de OpenAI, ElevenLabs, HeyGen y más.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-zinc-800 p-5">
                <h3 className="mb-2 text-sm font-semibold">{q}</h3>
                <p className="text-sm text-zinc-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
