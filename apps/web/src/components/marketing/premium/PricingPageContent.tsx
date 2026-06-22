"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Suspense } from "react";

import { PlanCheckoutButton } from "@/features/billing/PlanCheckoutButton";
import type { BillablePlanId } from "@/features/billing/planCheckout";
import { useAutoPlanCheckout } from "@/features/billing/useAutoPlanCheckout";

import { PLANS } from "./constants";
import { FadeIn } from "./FadeIn";
import { MarketingShell } from "./MarketingShell";

function PricingAutoCheckout() {
  useAutoPlanCheckout("/pricing");
  return null;
}

// ─── Comparison table rows ────────────────────────────────────────────────────

const TABLE_ROWS: { label: string; starter: string | boolean; pro: string | boolean; agency: string | boolean }[] = [
  { label: "CRM — contactos", starter: "1.000", pro: "Ilimitados", agency: "Ilimitados" },
  { label: "Email Marketing", starter: "5.000/mes", pro: "Ilimitado", agency: "Ilimitado" },
  { label: "SMS Marketing", starter: "500/mes", pro: "Ilimitado", agency: "Ilimitado" },
  { label: "WhatsApp Business", starter: false, pro: true, agency: true },
  { label: "Redes Sociales", starter: false, pro: true, agency: true },
  { label: "Google Ads + Meta Ads", starter: false, pro: true, agency: true },
  { label: "TikTok Ads + Snapchat Ads", starter: false, pro: false, agency: true },
  { label: "SEO — keywords rastreadas", starter: "20", pro: "Ilimitadas", agency: "Ilimitadas" },
  { label: "Auditoría SEO on-page", starter: false, pro: true, agency: true },
  { label: "Workflows automáticos", starter: "5 activos", pro: "Ilimitados", agency: "Ilimitados" },
  { label: "Form Builder + embed", starter: "3 forms", pro: "Ilimitados", agency: "Ilimitados" },
  { label: "Agenda y citas", starter: true, pro: true, agency: true },
  { label: "193 agentes IA por sector", starter: false, pro: true, agency: true },
  { label: "Portal de cliente", starter: false, pro: true, agency: true },
  { label: "Multi-workspace (clientes)", starter: false, pro: false, agency: true },
  { label: "White-label (tu marca)", starter: false, pro: false, agency: true },
  { label: "API + webhooks", starter: false, pro: true, agency: true },
  { label: "Informes PDF ejecutivos", starter: false, pro: true, agency: true },
  { label: "Soporte", starter: "Email 48h", pro: "Prioritario 24h", agency: "Account manager" },
  { label: "SLA", starter: "99.5%", pro: "99.5%", agency: "99.9%" },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <span className="text-indigo-400 text-lg">✓</span>;
  if (value === false) return <span className="text-zinc-700 text-lg">—</span>;
  return <span className="text-zinc-300 text-sm">{value}</span>;
}

export function PricingPageContent() {
  return (
    <MarketingShell>
      <Suspense fallback={null}>
        <PricingAutoCheckout />
      </Suspense>

      {/* Hero */}
      <section className="px-4 pb-8 pt-12 md:px-6 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 mb-4">
            Mejor que HubSpot + GoHighLevel juntos
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
            Todo lo que necesitas.<br />
            <span className="text-indigo-400">Sin límites artificiales.</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400">
            CRM · Email · SMS · WhatsApp · Redes Sociales · Publicidad · SEO · IA — en un solo plan.
            <br />
            <span className="text-zinc-500 text-base">Facturación mensual en EUR. Cancela cuando quieras.</span>
          </p>
        </motion.div>
      </section>

      {/* Pricing cards */}
      <section className="px-4 pb-16 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.id} delay={i * 0.1}>
              <div
                className={`relative flex h-full flex-col rounded-3xl border p-8 ${
                  plan.featured
                    ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/15 to-transparent shadow-2xl shadow-indigo-500/10"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
                    ⭐ Más popular — vs HubSpot 800€/mes
                  </span>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                  <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
                  <p className="mt-6">
                    <span className="text-5xl font-bold text-white">{plan.price}€</span>
                    <span className="text-zinc-500">/mes</span>
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-indigo-400 shrink-0 mt-0.5">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <PlanCheckoutButton
                  className={`mt-8 block w-full rounded-full py-3.5 text-center text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-110"
                      : "border border-white/15 text-white hover:bg-white/5"
                  }`}
                  planId={plan.id as BillablePlanId}
                  returnPath="/pricing"
                >
                  Empezar con {plan.name} →
                </PlanCheckoutButton>
                <p className="mt-3 text-center text-xs text-zinc-600">Sin permanencia · Cancela cuando quieras</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-4 pb-24 md:px-6">
        <FadeIn>
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-white mb-2">Comparativa detallada</h2>
            <p className="text-center text-zinc-500 text-sm mb-10">Todo lo que incluye cada plan — sin letra pequeña</p>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-500 w-1/3">Característica</th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-white">Starter<br /><span className="text-indigo-400 font-normal">97€/mes</span></th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-white bg-indigo-500/5 border-x border-indigo-500/20">Pro<br /><span className="text-indigo-400 font-normal">297€/mes</span></th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-white">Agency<br /><span className="text-indigo-400 font-normal">797€/mes</span></th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, i) => (
                    <tr key={row.label} className={`border-b border-white/[0.04] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                      <td className="px-6 py-3.5 text-sm text-zinc-400">{row.label}</td>
                      <td className="px-6 py-3.5 text-center"><Cell value={row.starter} /></td>
                      <td className="px-6 py-3.5 text-center bg-indigo-500/5 border-x border-indigo-500/20"><Cell value={row.pro} /></td>
                      <td className="px-6 py-3.5 text-center"><Cell value={row.agency} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                    <td className="px-6 py-4" />
                    <td className="px-6 py-4 text-center">
                      <PlanCheckoutButton planId="starter" returnPath="/pricing"
                        className="inline-block rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white hover:bg-white/5 transition">
                        Elegir Starter
                      </PlanCheckoutButton>
                    </td>
                    <td className="px-6 py-4 text-center bg-indigo-500/5 border-x border-indigo-500/20">
                      <PlanCheckoutButton planId="pro" returnPath="/pricing"
                        className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:brightness-110 transition">
                        Elegir Pro →
                      </PlanCheckoutButton>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PlanCheckoutButton planId="agency" returnPath="/pricing"
                        className="inline-block rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white hover:bg-white/5 transition">
                        Elegir Agency
                      </PlanCheckoutButton>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* FAQ / Reassurance */}
      <section className="border-t border-white/[0.06] px-4 py-16 md:px-6">
        <FadeIn>
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-white mb-10">Preguntas frecuentes</h2>
            <div className="space-y-6">
              {[
                { q: "¿Puedo cancelar en cualquier momento?", a: "Sí. Sin permanencia ni penalizaciones. Cancelas desde tu panel de facturación y mantienes acceso hasta el final del período pagado." },
                { q: "¿Los precios incluyen IVA?", a: "Los precios mostrados son sin IVA. El IVA aplicable se calcula según tu país de residencia en el checkout de Stripe." },
                { q: "¿Hay prueba gratuita?", a: "Ofrecemos 7 días de reembolso si el servicio no estuvo disponible más de 24 horas por causas nuestras. Consulta nuestra política de reembolso." },
                { q: "¿Qué diferencia hay con HubSpot o GoHighLevel?", a: "NELVYON incluye agentes IA que ejecutan tareas reales (no solo dashboards), es más fácil de usar, y tiene todos los módulos en un solo plan sin add-ons. HubSpot Pro cuesta 800€/mes y GoHighLevel 497$/mes — ambos sin IA real." },
                { q: "¿Puedo cambiar de plan?", a: "Sí. Puedes subir o bajar de plan en cualquier momento desde tu panel de facturación. El cambio aplica en el próximo ciclo." },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                  <p className="font-semibold text-white mb-2">{q}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-zinc-500">
              ¿Más dudas?{" "}
              <Link href="/contacto" className="text-indigo-400 underline-offset-4 hover:underline">
                Contáctanos
              </Link>
              {" "}o escríbenos a{" "}
              <a href="mailto:danicaste2004@gmail.com" className="text-indigo-400 hover:underline">danicaste2004@gmail.com</a>
            </p>
          </div>
        </FadeIn>
      </section>
    </MarketingShell>
  );
}
