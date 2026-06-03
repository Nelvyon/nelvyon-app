"use client";

import { cn } from "@/lib/pa/utils";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { PricingBadge } from "@/components/pa/pricing/pricing-badge";
import { Button } from "@/components/pa/button";
import Link from "next/link";
import { nelvyonContact, nelvyonSaasPlans } from "@/config/nelvyon-pa-content";

export const Pricing = ({
  disabelHeader = false,
  ctaText,
}: {
  disabelHeader?: boolean;
  ctaText?: string;
}) => {
  return (
    <section className="w-full border-t border-white/8">
      <Container className="flex flex-col gap-20 py-20 md:py-30">
        {!disabelHeader && (
          <div className="flex w-full flex-col justify-between gap-4 lg:flex-row">
            <Header>Planes SaaS</Header>
            <div className="-tracking-xs text-base leading-6 font-medium text-white/75 md:text-nowrap">
              Dudas? Escribenos a{" "}
              <Link
                href={`mailto:${nelvyonContact.email}`}
                className="text-[#0084FF] underline underline-offset-3"
              >
                {nelvyonContact.email}
              </Link>{" "}
              y te ayudamos a elegir plan.
            </div>
          </div>
        )}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {nelvyonSaasPlans.map((plan, index) => {
              const isFeatured = index === 1;
              return (
                <div
                  key={plan.name}
                  className={cn(
                    "relative flex flex-col gap-6 overflow-hidden rounded-3xl border p-6 md:p-8",
                    isFeatured
                      ? "border-[#0084FF]/45 bg-[#020817] text-white shadow-[0_0_56px_rgba(0,132,255,0.18)] ring-1 ring-[#0084FF]/30"
                      : "border-white/10 bg-[#07111F] text-white",
                  )}
                >
                  {isFeatured && (
                    <div
                      className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[#0047AB]/40 blur-3xl"
                      aria-hidden
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="-tracking-sm text-lg leading-5 font-medium text-white">
                      {plan.name}
                    </span>
                    {isFeatured ? (
                      <PricingBadge>Recomendado</PricingBadge>
                    ) : null}
                  </div>
                  <div className="-tracking-xs text-sm leading-5 font-medium text-[#0084FF]">
                    {plan.forWho}
                  </div>
                  <div className="-tracking-xs text-base leading-6 font-medium text-white/75">
                    {plan.subtitle}
                  </div>
                  <div className="-tracking-xs text-4xl leading-10 font-medium text-white">
                    <span className="text-2xl text-white/80">€</span>
                    <span>{plan.price}</span>
                    <span className="text-2xl text-white/55">{plan.billing}</span>
                  </div>
                  <div>
                    <Button variant="primary" text={ctaText ?? plan.cta} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 border-t border-white/8 pt-4">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="text-sm leading-5 font-medium text-white/70"
                      >
                        <span className="text-[#0084FF]">•</span> {feature}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
};
