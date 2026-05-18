"use client";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

import type { SaasPlan } from "./types";

export type StepPlanProps = {
  selected: SaasPlan;
  onSelect: (p: SaasPlan) => void;
  onNext: () => void;
  onBack: () => void;
  busy: boolean;
  error: string | null;
};

const PLANS: { id: SaasPlan; title: string; blurb: string; badge: string }[] = [
  {
    id: "starter",
    title: "Starter",
    blurb: "Ideal para equipos que empiezan: núcleo de funciones, soporte estándar y despliegue rápido.",
    badge: "Esencial",
  },
  {
    id: "pro",
    title: "Pro",
    blurb: "Para empresas en crecimiento: más capacidad, automatizaciones y prioridad en mejoras.",
    badge: "Popular",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    blurb: "Seguridad, SLA y personalización: integraciones dedicadas, gobierno de datos y éxito cliente.",
    badge: "Escala",
  },
];

export function StepPlan({ selected, onSelect, onNext, onBack, busy, error }: StepPlanProps) {
  return (
    <NelvyonDsCard title="Paso 2 — Plan de suscripción">
      <p className="mb-4 text-sm text-muted-foreground">Elige el plan que mejor encaja; podrás ajustarlo más adelante con facturación.</p>
      <div className="grid gap-3 sm:grid-cols-1">
        {PLANS.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => onSelect(p.id)}
              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-foreground">{p.title}</span>
                <NelvyonDsBadge tone={active ? "primary" : "neutral"}>{p.badge}</NelvyonDsBadge>
              </div>
              <p className="text-sm text-muted-foreground">{p.blurb}</p>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <NelvyonDsButton type="button" variant="secondary" onClick={onBack} disabled={busy}>
          Atrás
        </NelvyonDsButton>
        <NelvyonDsButton type="button" size="lg" onClick={onNext} disabled={busy}>
          Continuar
        </NelvyonDsButton>
      </div>
    </NelvyonDsCard>
  );
}
