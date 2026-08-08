"use client";

/**
 * Paso 4 con tarjeta, lista de resumen y badge de W3CRM.
 *
 * CONTRATO — `e2e/onboarding.spec.ts`:
 *   - `getByText("Paso 4 — Confirmación")` como título.
 *   - `getByRole("button", { name: "Ir al Dashboard" })` con ese nombre EXACTO.
 *     Ojo: ese botón NO navega al dashboard; dispara
 *     `POST /api/saas/onboarding/complete` y sale a `/saas/setup`. El texto es
 *     contrato, así que se conserva tal cual.
 *
 * SANEADO: ningún campo del tenant llega crudo al DOM; los ausentes se pintan
 * "—", y `goals` se valida como array antes de unirla.
 */
import type { SaasTenantDto } from "./types";

export type StepConfirmProps = {
  tenant: SaasTenantDto;
  onBack: () => void;
  onFinish: () => void;
  busy: boolean;
  error: string | null;
};

function txt(v: unknown): string { return typeof v === "string" ? v : ""; }

export function StepConfirm({ tenant, onBack, onFinish, busy, error }: StepConfirmProps) {
  const objetivos = Array.isArray(tenant.goals)
    ? tenant.goals.filter((g): g is string => typeof g === "string")
    : [];

  const filas: Array<{ k: string; v: string; badge?: boolean }> = [
    { k: "Empresa", v: txt(tenant.companyName) || "—" },
    { k: "Industria", v: txt(tenant.industry) || "—" },
    { k: "Plan", v: txt(tenant.plan) || "—", badge: true },
    { k: "Web", v: txt(tenant.website) || "—" },
    { k: "Teléfono", v: txt(tenant.phone) || "—" },
    { k: "Empleados", v: txt(tenant.employees) || "—" },
    { k: "Objetivos", v: objetivos.length ? objetivos.join(", ") : "—" },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title">Paso 4 — Confirmación</h4>
      </div>
      <div className="card-body">
        <p className="fs-14 text-muted">
          Revisa los datos antes de entrar al panel. Podrás editarlos después con tu equipo.
        </p>

        <ul className="list-group list-group-flush mb-3">
          {filas.map((f) => (
            <li key={f.k} className="list-group-item d-flex align-items-center justify-content-between px-0">
              <span className="text-muted fs-14">{f.k}</span>
              {f.badge ? (
                <span className="badge badge-primary">{f.v}</span>
              ) : (
                <span className="fw-bold">{f.v}</span>
              )}
            </li>
          ))}
        </ul>

        {error ? <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div> : null}

        <div className="d-flex flex-wrap justify-content-between gap-2">
          <button type="button" className="btn btn-primary light" onClick={onBack} disabled={busy}>
            Atrás
          </button>
          <button type="button" className="btn btn-primary" onClick={onFinish} disabled={busy}>
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
