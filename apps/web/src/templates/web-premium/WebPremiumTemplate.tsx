import type { CSSProperties } from "react";

import type { WebPremiumSiteConfig } from "@/templates/web-premium/types";
import { WebPremiumAbout } from "@/templates/web-premium/sections/About";
import { WebPremiumCta } from "@/templates/web-premium/sections/Cta";
import { WebPremiumFooter } from "@/templates/web-premium/sections/Footer";
import { WebPremiumHero } from "@/templates/web-premium/sections/Hero";
import { WebPremiumServices } from "@/templates/web-premium/sections/Services";
import { WebPremiumDeliveryChecklist } from "@/templates/web-premium/WebPremiumDeliveryChecklist";

interface Props {
  config: WebPremiumSiteConfig;
  /** When true, render internal OS QA panel (delivery checklist). */
  showDeliveryPanel?: boolean;
}

export function WebPremiumTemplate({ config, showDeliveryPanel = false }: Props) {
  const surfaceStyle = {
    "--wp-accent": config.theme.accentHex,
  } as CSSProperties;

  return (
    <div
      className="web-premium-template isolate rounded-xl border border-border bg-muted/25 text-foreground shadow-card dark:bg-muted/15"
      style={surfaceStyle}
    >
      <div className="relative">
        <a
          className="absolute left-2 top-2 z-[200] whitespace-nowrap rounded-md bg-card px-3 py-2 text-sm font-semibold text-foreground opacity-0 shadow-elevated focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href="#main-content"
        >
          Skip to content
        </a>
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14" id="main-content">
          {showDeliveryPanel ? (
            <p className="mb-10 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning-foreground">
              <strong className="font-semibold">Internal OS preview</strong>
              {" · "}
              Web Premium template v2 — NELVYON Design System applied. Configuration-only demo; not wired to tenant backends or
              client DNS.
            </p>
          ) : null}
          <div className="flex flex-col space-y-16 lg:space-y-24">
            <WebPremiumHero accentHex={config.theme.accentHex} hero={config.hero} />
            <WebPremiumAbout about={config.about} />
            <WebPremiumServices services={config.services} />
            <WebPremiumCta accentHex={config.theme.accentHex} cta={config.cta} />
          </div>
        </main>
      </div>
      {showDeliveryPanel ? <WebPremiumDeliveryChecklist /> : null}
      <WebPremiumFooter footer={config.footer} />
    </div>
  );
}
