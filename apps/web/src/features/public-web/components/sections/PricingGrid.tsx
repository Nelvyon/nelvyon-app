"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { PricingPlan } from "../../content/siteContent";
import { Reveal } from "../Reveal";
import { Container, SectionHeading, SectionShell } from "../ui";

const PLAN_ICONS: Record<string, string> = {
  starter: "/brand/public/product/icon7.png",
  growth: "/brand/public/product/icon5.png",
  elite: "/brand/public/product/icon6.png",
};

export function PricingGrid({
  plans,
  eyebrow = "Planes SaaS",
  title = "Descubra el plan adecuado para su operación",
  description = "Facturación mensual en euros. El alcance exacto se confirma en onboarding.",
}: {
  plans: readonly PricingPlan[];
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const priced = useMemo(
    () =>
      plans.map((plan) => {
        const yearly = Math.round(plan.priceMonthlyEur * 10);
        return {
          ...plan,
          displayPrice: period === "monthly" ? plan.priceLabel : `${yearly}€`,
          displayPeriod: period === "monthly" ? "/mes" : "/año",
          note: period === "yearly" ? "Equivalente a 10 meses (2 meses de ahorro)" : plan.period,
        };
      }),
    [plans, period],
  );

  return (
    <SectionShell soft>
      <Container>
        <Reveal>
          <SectionHeading eyebrow={eyebrow} title={title} description={description} align="center" />
        </Reveal>

        <div className="mt-10 flex justify-center">
          <div className="nv-public-toggle" data-active={period}>
            <span data-side="monthly">Mensual</span>
            <button
              type="button"
              className="nv-public-toggle-track"
              aria-label="Alternar facturación mensual o anual"
              onClick={() => setPeriod((p) => (p === "monthly" ? "yearly" : "monthly"))}
            >
              <span className="nv-public-toggle-thumb" />
            </button>
            <span data-side="yearly">Anual</span>
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {priced.map((plan, i) => (
            <Reveal key={plan.id} delayMs={i * 60}>
              <article className={`nv-public-pricing-card ${plan.featured ? "nv-public-pricing-card--featured" : ""}`}>
                {plan.featured ? (
                  <span className="mb-4 inline-flex w-fit rounded-full bg-[rgba(0,132,255,0.16)] px-3 py-1 text-xs font-semibold text-[var(--nv-accent)]">
                    {plan.badge || "Recomendado"}
                  </span>
                ) : (
                  <span className="mb-4 inline-block h-6" />
                )}
                <Image
                  src={PLAN_ICONS[plan.id] || "/brand/public/product/icon7.png"}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
                <h3 className="mt-5 text-xl font-semibold text-[var(--nv-fg-strong)]">{plan.name}</h3>
                <p className="mt-2 text-sm text-[var(--nv-muted)]">{plan.description}</p>
                <div className="mt-6 flex items-end gap-2 border-b border-[var(--nv-border)] pb-6">
                  <span className="nv-public-display text-5xl text-[var(--nv-fg-strong)] md:text-6xl">{plan.displayPrice}</span>
                  <span className="pb-2 text-sm text-[var(--nv-muted)]">{plan.displayPeriod}</span>
                </div>
                <p className="mt-3 text-xs text-[var(--nv-muted-2)]">{plan.note}</p>
                <p className="mt-6 text-sm font-semibold text-[var(--nv-fg-strong)]">Capacidades clave</p>
                <ul className="mt-4 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="relative pl-9 text-sm font-medium text-[var(--nv-muted)]">
                      <Image
                        src="/brand/public/product/icon8.png"
                        alt=""
                        width={18}
                        height={18}
                        className="absolute left-0 top-0.5 h-[18px] w-[18px]"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.cta.href}
                  className={`nv-public-btn mt-8 w-full ${
                    plan.featured ? "nv-public-btn-primary" : "nv-public-btn-secondary"
                  }`}
                >
                  {plan.cta.label}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}
