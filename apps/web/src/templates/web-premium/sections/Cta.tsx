"use client";

import Link from "next/link";
import * as React from "react";
import type { CSSProperties, ReactNode } from "react";

import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { cn } from "@/core/ui/utils";
import type { WebPremiumCtaSection } from "@/templates/web-premium/types";

interface Props {
  cta: WebPremiumCtaSection;
  accentHex: string;
}

const JumpLink = React.forwardRef<HTMLAnchorElement, { href: string; className?: string; style?: CSSProperties; children: ReactNode }>(
  function JumpLink({ href, className, style, children }, ref) {
    const merged = cn(className);
    if (href.startsWith("#")) {
      return (
        <a ref={ref} className={merged} href={href} style={style}>
          {children}
        </a>
      );
    }
    return (
      <Link ref={ref} className={merged} href={href} style={style}>
        {children}
      </Link>
    );
  },
);

JumpLink.displayName = "JumpLink";

export function WebPremiumCta({ cta, accentHex }: Props) {
  const sectionId = cta.id ?? "cta";
  return (
    <section aria-labelledby={`${sectionId}-heading`} className="scroll-mt-24" id={sectionId}>
      <NelvyonDsCard className="p-8 shadow-elevated sm:p-10">
        <NelvyonDsSectionHeader className="mb-6 border-0 pb-0" id={`${sectionId}-heading`} subtitle={cta.body} title={cta.heading} />
        <NelvyonDsButton asChild size="lg" variant="primary">
          <JumpLink href={cta.cta.href} style={{ backgroundColor: accentHex }}>
            {cta.cta.label}
          </JumpLink>
        </NelvyonDsButton>
      </NelvyonDsCard>
    </section>
  );
}
