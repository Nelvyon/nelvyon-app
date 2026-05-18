"use client";

import Image from "next/image";

import { NelvyonDsButton, NelvyonDsSectionHeader } from "@/design-system/components";
import type { WebPremiumHeroSection } from "@/templates/web-premium/types";

interface Props {
  hero: WebPremiumHeroSection;
  accentHex: string;
}

export function WebPremiumHero({ hero, accentHex }: Props) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,480px)] lg:items-center" id="top">
      <div className="space-y-6">
        <NelvyonDsSectionHeader
          eyebrow={hero.eyebrow}
          id="hero-heading"
          subtitle={hero.subheading}
          title={hero.heading}
        />
        <div className="flex flex-wrap gap-3">
          <NelvyonDsButton asChild size="lg" variant="primary">
            <a href={hero.primaryCta.href} style={{ backgroundColor: accentHex }}>
              {hero.primaryCta.label}
            </a>
          </NelvyonDsButton>
          {hero.secondaryCta ? (
            <NelvyonDsButton asChild size="lg" variant="ghost">
              <a href={hero.secondaryCta.href}>{hero.secondaryCta.label}</a>
            </NelvyonDsButton>
          ) : null}
        </div>
      </div>
      <figure className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted shadow-card">
        <Image
          alt={hero.heroImageAlt}
          className="object-cover"
          height={640}
          priority
          sizes="(max-width: 1024px) 100vw, 480px"
          src={hero.heroImageSrc}
          width={960}
        />
      </figure>
    </div>
  );
}
