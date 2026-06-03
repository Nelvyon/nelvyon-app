"use client";

import { cn } from "@/lib/pa/utils";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { PricingBadge } from "@/components/pa/pricing/pricing-badge";
import { Button } from "@/components/pa/button";
import Link from "next/link";
import { nelvyonContact, nelvyonSaasPlans } from "@/config/nelvyon-pa-content";

export const Pricing = ({ disabelHeader = false }: { disabelHeader?: boolean }) => {
  return (
    <section className="w-full">
      <Container className="flex flex-col gap-20 py-20 md:py-30">
        {!disabelHeader && (
          <div className="flex w-full flex-col justify-between gap-4 lg:flex-row">
            <Header>Planes SaaS</Header>
            <div className="-tracking-xs text-base leading-6 font-medium md:text-nowrap">
              Dudas? Escribenos a{" "}
              <Link
                href={`mailto:${nelvyonContact.email}`}
                className="text-dusty-green underline underline-offset-3"
              >
                {nelvyonContact.email}
              </Link>{" "}
              y te ayudamos a elegir plan.
            </div>
          </div>
        )}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {nelvyonSaasPlans.map((plan, index) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col gap-6 overflow-hidden rounded-3xl p-6",
                  index === 1 ? "bg-natural-black text-natural-white" : "bg-natural-white text-natural-black",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="-tracking-sm text-lg leading-5 font-medium">{plan.name}</span>
                  <PricingBadge variant={index === 1 ? "success" : "danger"}>
                    {index === 1 ? "Recomendado" : "Disponible"}
                  </PricingBadge>
                </div>
                <div className="-tracking-xs text-sm leading-5 font-medium text-[#0084FF]">
                  {plan.forWho}
                </div>
                <div className="-tracking-xs text-base leading-6 font-medium text-muted-foreground">
                  {plan.subtitle}
                </div>
                <div className="-tracking-xs text-4xl leading-10 font-medium">
                  <span className="text-2xl">€</span>
                  <span>{plan.price}</span>
                  <span className="text-2xl">{plan.billing}</span>
                </div>
                <div>
                  <Button text={plan.cta} />
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="text-sm leading-5 font-medium text-muted-foreground">
                      • {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

