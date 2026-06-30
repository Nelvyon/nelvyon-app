import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { NelvyonDsBadge, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { listFunnelElitePresets } from "@/lib/eliteTemplates/funnelTemplates";

/** OS Funnel Premium — elite multi-step presets wired to SaaS funnels builder. */

export const metadata = {
  title: "Funnel Premium · Preview OS | Nelvyon",
  description: "Embudos multi-paso por sector — anuncio → landing → conversión → CRM.",
};

export default function OsFunnelPremiumPreviewPage() {
  const presets = listFunnelElitePresets().slice(0, 6);

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <NelvyonDsSectionHeader
          title="Funnel Premium"
          subtitle="Presets de embudo por sector — listos para clonar en el builder SaaS"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {presets.map((preset) => (
            <NelvyonDsCard key={preset.id} className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <NelvyonDsBadge tone="primary">{preset.sectorGroup}</NelvyonDsBadge>
                <NelvyonDsBadge tone="neutral">{preset.sector}</NelvyonDsBadge>
              </div>
              <div>
                <p className="font-semibold text-foreground">{preset.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{preset.tagline}</p>
              </div>
              <ol className="space-y-1 text-xs text-muted-foreground">
                {preset.steps.map((step, i) => (
                  <li key={step.name}>
                    {i + 1}. {step.name}
                    {step.exit_url ? ` → ${step.exit_url}` : ""}
                  </li>
                ))}
              </ol>
              <Link
                href="/saas/funnels"
                className="mt-auto text-sm font-medium text-primary hover:underline"
              >
                Abrir en builder SaaS →
              </Link>
            </NelvyonDsCard>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
