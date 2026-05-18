"use client";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

export type StepWelcomeProps = {
  companyName: string;
  industry: string;
  onCompanyNameChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onNext: () => void;
  busy: boolean;
  error: string | null;
};

export function StepWelcome({
  companyName,
  industry,
  onCompanyNameChange,
  onIndustryChange,
  onNext,
  busy,
  error,
}: StepWelcomeProps) {
  return (
    <NelvyonDsCard title="Paso 1 — Bienvenida">
      <p className="mb-4 text-sm text-muted-foreground">Cuéntanos quién eres para personalizar tu experiencia.</p>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Nombre de la empresa</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            autoComplete="organization"
            disabled={busy}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Industria</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            value={industry}
            onChange={(e) => onIndustryChange(e.target.value)}
            placeholder="Ej. Retail, SaaS B2B, Salud…"
            disabled={busy}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end pt-2">
          <NelvyonDsButton type="button" size="lg" onClick={onNext} disabled={busy}>
            Continuar
          </NelvyonDsButton>
        </div>
      </div>
    </NelvyonDsCard>
  );
}
