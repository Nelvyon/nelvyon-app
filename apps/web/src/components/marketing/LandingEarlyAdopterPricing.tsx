"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PLANS = [
  {
    name: "Starter",
    base: 47,
    early: 28,
    features: ["Hasta 3 agentes activos", "Informes mensuales", "Soporte por email", "Ideal para validar"],
    highlight: false,
  },
  {
    name: "Pro",
    base: 197,
    early: 118,
    features: ["Agentes ilimitados", "Prioridad en cola", "Integraciones avanzadas", "Soporte prioritario"],
    highlight: true,
  },
  {
    name: "Agency",
    base: 497,
    early: 298,
    features: ["Multi-workspace", "API & white-label", "Account manager", "SLA dedicado"],
    highlight: false,
  },
] as const;

type EarlyAdopterStatus = {
  active: boolean;
  slotsLeft: number;
  expiresAt: string;
  discountPct: number;
};

export function LandingEarlyAdopterPricing() {
  const [ea, setEa] = useState<EarlyAdopterStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/early-adopter/status");
        if (!res.ok) return;
        const body = (await res.json()) as EarlyAdopterStatus;
        if (!cancelled) setEa(body);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-14 grid gap-6 md:grid-cols-3">
      {PLANS.map((plan) => {
        const price = ea?.active ? plan.early : plan.base;
        return (
          <article
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border bg-zinc-900/40 p-8 ${
              plan.highlight ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-zinc-800"
            }`}
          >
            {plan.highlight ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                Más popular
              </span>
            ) : null}
            <h3 className="text-xl font-bold text-zinc-100">{plan.name}</h3>
            <p className="mt-2 text-3xl font-black text-zinc-50">
              {ea?.active ? (
                <>
                  <span className="mr-2 text-lg font-medium text-zinc-500 line-through">{plan.base}€</span>
                  {price}€
                </>
              ) : (
                <>{price}€</>
              )}
              <span className="text-base font-medium text-zinc-500">/mes</span>
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-zinc-400">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-indigo-400">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={ea?.active ? "/pricing" : "/register"}
              className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              {ea?.active ? "Conseguir Early Adopter →" : "Empezar →"}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
