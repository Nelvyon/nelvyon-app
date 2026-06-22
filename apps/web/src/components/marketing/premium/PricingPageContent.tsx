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

export function PricingPageContent() {
  return (
    <MarketingShell>
      <Suspense fallback={null}>
        <PricingAutoCheckout />
      </Suspense>
      <section className="px-4 pb-8 pt-12 md:px-6 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">Precios claros</h1>
          <p className="mt-6 text-lg text-zinc-400">
            Tres planes para cada etapa. Sin sorpresas. Facturación mensual en EUR.
          </p>
        </motion.div>
      </section>

      <section className="px-4 pb-24 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.id} delay={i * 0.1}>
              <div
                className={`relative flex h-full flex-col rounded-3xl border p-8 ${
                  plan.featured
                    ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/15 to-transparent shadow-2xl shadow-indigo-500/10"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                {plan.featured ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                    Más popular
                  </span>
                ) : null}
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
                <p className="mt-8">
                  <span className="text-5xl font-bold text-white">{plan.price}€</span>
                  <span className="text-zinc-500">/mes</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-indigo-400">✓</span>
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
                  Elegir {plan.name}
                </PlanCheckoutButton>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-4 py-16 md:px-6">
        <FadeIn>
          <p className="mx-auto max-w-xl text-center text-sm text-zinc-500">
            ¿Dudas sobre qué plan elegir?{" "}
            <Link href="/contacto" className="text-indigo-400 underline-offset-4 hover:underline">
              Contáctanos
            </Link>
            .
          </p>
        </FadeIn>
      </section>
    </MarketingShell>
  );
}
