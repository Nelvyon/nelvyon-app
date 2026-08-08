"use client";

/**
 * Paso 1 con el marcado de tarjeta y formulario de W3CRM.
 *
 * CONTRATO — `e2e/onboarding.spec.ts`:
 *   - `getByText("Paso 1 — Bienvenida")` como título de la tarjeta.
 *   - `getByLabel("Nombre de la empresa")` y `getByLabel("Industria")`: los
 *     `label` se asocian por `htmlFor`/`id`, que es lo que resuelve `getByLabel`.
 *   - `getByRole("button", { name: "Continuar" })` con ese nombre EXACTO.
 */
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
    <div className="card">
      <div className="card-header">
        <h4 className="card-title">Paso 1 — Bienvenida</h4>
      </div>
      <div className="card-body">
        <p className="fs-14 text-muted">Cuéntanos quién eres para personalizar tu experiencia.</p>

        <div className="form-group mb-3">
          <label htmlFor="ob-empresa" className="text-black font-w600">Nombre de la empresa</label>
          <input
            id="ob-empresa"
            className="form-control"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            autoComplete="organization"
            disabled={busy}
          />
        </div>

        <div className="form-group mb-3">
          <label htmlFor="ob-industria" className="text-black font-w600">Industria</label>
          <input
            id="ob-industria"
            className="form-control"
            value={industry}
            onChange={(e) => onIndustryChange(e.target.value)}
            placeholder="Ej. Retail, SaaS B2B, Salud…"
            disabled={busy}
          />
        </div>

        {error ? <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div> : null}

        <div className="text-end">
          <button type="button" className="btn btn-primary" onClick={onNext} disabled={busy}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
