"use client";

import Link from "next/link";
import { Megaphone, UserPlus, Zap } from "lucide-react";

import { Button } from "@/core/ui/button";
import { SectionTitle } from "@/core/ui/typography";

const PRESETS = [
  {
    id: "new-lead-followup",
    icon: UserPlus,
    title: "Seguimiento de nuevo cliente",
    description:
      "Cuando registras un cliente en Revenue, crea una campaña de bienvenida o un ticket interno para no perder el momentum.",
    steps: ["Añade el cliente en Revenue", "Lanza una campaña de nurturing", "Registra el deal en el pipeline"],
    primaryHref: "/crm/clients/new",
    primaryLabel: "Añadir cliente",
    secondaryHref: "/campaigns/new",
    secondaryLabel: "Crear campaña",
  },
  {
    id: "ticket-to-campaign",
    icon: Megaphone,
    title: "Ticket → acción comercial",
    description:
      "Si un ticket de soporte revela una oportunidad, vincula la conversación con una campaña o un deal para convertir la demanda.",
    steps: ["Abre el ticket en Helpdesk", "Crea o actualiza el deal", "Activa una campaña segmentada"],
    primaryHref: "/inbox/tickets/new",
    primaryLabel: "Nuevo ticket",
    secondaryHref: "/crm/deals",
    secondaryLabel: "Ver pipeline",
  },
] as const;

/** Guided mini-playbooks — deep links only; no backend side effects. */
export function QuickWinAutomations() {
  return (
    <section
      aria-label="Automatizaciones recomendadas"
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Zap className="size-5" aria-hidden />
        </div>
        <div>
          <SectionTitle>Automatizaciones rápidas</SectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Dos flujos probados para equipos comerciales. No ejecutan código por ti: te guían paso a paso con enlaces
            directos.
          </p>
        </div>
      </div>
      <ul className="mt-5 grid gap-4 lg:grid-cols-2">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <li className="rounded-lg border border-border bg-muted/30 p-4" key={preset.id}>
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" aria-hidden />
                <h3 className="font-semibold text-foreground">{preset.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{preset.description}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                {preset.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={preset.primaryHref}>{preset.primaryLabel}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={preset.secondaryHref}>{preset.secondaryLabel}</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
