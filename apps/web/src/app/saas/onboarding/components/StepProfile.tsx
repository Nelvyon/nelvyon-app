"use client";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

const GOAL_OPTIONS = [
  { id: "leads", label: "Generar más leads" },
  { id: "brand", label: "Fortalecer marca" },
  { id: "automation", label: "Automatizar procesos" },
  { id: "support", label: "Mejorar soporte al cliente" },
  { id: "analytics", label: "Reporting y analítica" },
  { id: "scale", label: "Escalar operaciones" },
];

const EMPLOYEE_RANGES = ["1–10", "11–50", "51–200", "201–1000", "1000+"];

export type StepProfileProps = {
  website: string;
  phone: string;
  employees: string;
  goals: string[];
  onWebsiteChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmployeesChange: (v: string) => void;
  onToggleGoal: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  busy: boolean;
  error: string | null;
};

export function StepProfile({
  website,
  phone,
  employees,
  goals,
  onWebsiteChange,
  onPhoneChange,
  onEmployeesChange,
  onToggleGoal,
  onNext,
  onBack,
  busy,
  error,
}: StepProfileProps) {
  return (
    <NelvyonDsCard title="Paso 3 — Perfil">
      <p className="mb-4 text-sm text-muted-foreground">Datos operativos para adaptar comunicaciones y límites del plan.</p>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Sitio web</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="https://"
            inputMode="url"
            disabled={busy}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Teléfono</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            inputMode="tel"
            disabled={busy}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Número de empleados</span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={employees}
            onChange={(e) => onEmployeesChange(e.target.value)}
            disabled={busy}
          >
            <option value="">Selecciona…</option>
            {EMPLOYEE_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Objetivos (elige los que apliquen)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOAL_OPTIONS.map((g) => {
              const checked = goals.includes(g.id);
              return (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    checked={checked}
                    disabled={busy}
                    onChange={() => onToggleGoal(g.id)}
                  />
                  <span>{g.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          <NelvyonDsButton type="button" variant="secondary" onClick={onBack} disabled={busy}>
            Atrás
          </NelvyonDsButton>
          <NelvyonDsButton type="button" size="lg" onClick={onNext} disabled={busy}>
            Continuar
          </NelvyonDsButton>
        </div>
      </div>
    </NelvyonDsCard>
  );
}
