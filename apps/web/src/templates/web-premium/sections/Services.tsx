"use client";

import Image from "next/image";

import { NelvyonDsBadge, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import type { WebPremiumServicesSection } from "@/templates/web-premium/types";

const BADGE_TONES = ["primary", "success", "neutral"] as const;

interface Props {
  services: WebPremiumServicesSection;
}

export function WebPremiumServices({ services }: Props) {
  const sectionId = services.id ?? "services";
  return (
    <section aria-labelledby={`${sectionId}-heading`} className="scroll-mt-24 space-y-8" id={sectionId}>
      <NelvyonDsSectionHeader
        id={`${sectionId}-heading`}
        subtitle={services.intro}
        title={services.heading}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.items.map((item, index) => (
          <li key={item.title}>
            <NelvyonDsCard className="h-full">
              <div className="relative mb-3 h-24 overflow-hidden rounded-lg bg-muted">
                <Image
                  alt=""
                  className="object-cover opacity-80 dark:opacity-60"
                  height={96}
                  loading="lazy"
                  src="/web-premium/hero.svg"
                  width={320}
                />
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <NelvyonDsBadge tone={BADGE_TONES[index % BADGE_TONES.length]}>{item.badge ?? "Core"}</NelvyonDsBadge>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </NelvyonDsCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
