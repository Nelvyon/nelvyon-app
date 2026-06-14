"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";

const ANALYTICS_LINKS = [
  {
    href: "/analytics/revenue",
    title: "Revenue y pipeline",
    description: "Deals, conversión por etapa y valor ponderado del pipeline.",
  },
  {
    href: "/analytics/social",
    title: "Social",
    description: "Alcance, engagement, sentimiento y volumen de publicaciones.",
  },
  {
    href: "/analytics/publicidad",
    title: "Publicidad",
    description: "Inversión, ROAS y alertas de Google Ads y Meta Ads.",
  },
  {
    href: "/analytics/funnels",
    title: "Embudos",
    description: "Conversión por paso y campaña, integrado con CRM y ads.",
  },
  {
    href: "/analytics/campaigns",
    title: "Campañas",
    description: "Rendimiento email y multicanal por workspace.",
  },
  {
    href: "/analytics/tickets",
    title: "Helpdesk",
    description: "SLA real, incumplimientos y volumen de tickets.",
  },
  {
    href: "/analytics/reportes",
    title: "Reportes exportables",
    description: "Informes visuales por módulo con descarga CSV.",
  },
];

export default function AnalyticsHubPage() {
  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <ReportingSubNav />
        <p className="text-sm text-muted-foreground">
          Centro de analítica unificado del workspace. Elige un módulo para profundizar en métricas operativas.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ANALYTICS_LINKS.map((item) => (
            <Link href={item.href} key={item.href}>
              <PanelCard className="h-full transition-shadow hover:shadow-md">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </PanelCard>
            </Link>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
