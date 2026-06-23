"use client";

import Link from "next/link";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

import type { SaasTenantDto } from "./types";

export type StepConfirmProps = {
  tenant: SaasTenantDto;
  onBack: () => void;
  onFinish: () => void;
  busy: boolean;
  error: string | null;
  acceptedLegal: boolean;
  onAcceptedLegalChange: (value: boolean) => void;
};

export function StepConfirm({
  tenant,
  onBack,
  onFinish,
  busy,
  error,
  acceptedLegal,
  onAcceptedLegalChange,
}: StepConfirmProps) {
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
      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
        <input
          checked={acceptedLegal}
          className="mt-1 h-4 w-4 rounded border-input"
          onChange={(e) => onAcceptedLegalChange(e.target.checked)}
          type="checkbox"
        />
        <span>
          He leído y acepto los{" "}
          <Link className="font-medium text-link hover:underline" href="/legal/terms" target="_blank">
            Términos de servicio
          </Link>{" "}
          y la{" "}
          <Link className="font-medium text-link hover:underline" href="/legal/privacy" target="_blank">
            Política de privacidad
          </Link>
          . Entiendo que NELVYON es software propietario y que yo conservo la titularidad de mis datos y contenidos.
        </span>
      </label>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <NelvyonDsButton type="button" variant="secondary" onClick={onBack} disabled={busy}>
          Atrás
        </NelvyonDsButton>
        <NelvyonDsButton type="button" size="lg" onClick={onFinish} disabled={busy || !acceptedLegal}>
          Ir al Dashboard
        </NelvyonDsButton>
      </div>
    </NelvyonDsCard>
  );
}
