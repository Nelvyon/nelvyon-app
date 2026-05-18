"use client";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

import type { SaasTenantDto } from "./types";

export type StepConfirmProps = {
  tenant: SaasTenantDto;
  onBack: () => void;
  onFinish: () => void;
  busy: boolean;
  error: string | null;
};

export function StepConfirm({ tenant, onBack, onFinish, busy, error }: StepConfirmProps) {
  return (
    <NelvyonDsCard title="Paso 4 — Confirmación">
      <p className="mb-4 text-sm text-muted-foreground">Revisa los datos antes de entrar al panel. Podrás editarlos después con tu equipo.</p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Empresa</dt>
          <dd className="font-medium text-foreground">{tenant.companyName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Industria</dt>
          <dd className="font-medium text-foreground">{tenant.industry}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Plan</dt>
          <dd>
            <NelvyonDsBadge tone="primary">{tenant.plan}</NelvyonDsBadge>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Web</dt>
          <dd className="text-foreground">{tenant.website || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Teléfono</dt>
          <dd className="text-foreground">{tenant.phone || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Empleados</dt>
          <dd className="text-foreground">{tenant.employees || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Objetivos</dt>
          <dd className="text-foreground">{tenant.goals.length ? tenant.goals.join(", ") : "—"}</dd>
        </div>
      </dl>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <NelvyonDsButton type="button" variant="secondary" onClick={onBack} disabled={busy}>
          Atrás
        </NelvyonDsButton>
        <NelvyonDsButton type="button" size="lg" onClick={onFinish} disabled={busy}>
          Ir al Dashboard
        </NelvyonDsButton>
      </div>
    </NelvyonDsCard>
  );
}
