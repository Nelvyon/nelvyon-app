"use client";

/**
 * Paso 2 con tarjetas y badges de W3CRM.
 *
 * CONTRATO: `getByText("Paso 2 — Plan de suscripción")` como título.
 *
 * SANEADO: si el backend devuelve un plan fuera del catálogo, ninguna tarjeta
 * queda marcada —que es lo correcto: no se puede fingir una selección que no
 * existe— y se avisa de forma explícita en vez de dejar la pantalla muda.
 */
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
  const enCatalogo = PLANS.some((p) => p.id === selected);

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title">Paso 2 — Plan de suscripción</h4>
      </div>
      <div className="card-body">
        <p className="fs-14 text-muted">
          Elige el plan que mejor encaja; podrás ajustarlo más adelante con facturación.
        </p>

        {!enCatalogo && (
          <div className="alert alert-warning py-2 fs-14" role="status">
            Tu cuenta tiene el plan <strong>{String(selected)}</strong>, que no figura en este catálogo.
            Elige uno de los de abajo para continuar.
          </div>
        )}

        <div className="row" role="group" aria-label="Planes disponibles">
          {PLANS.map((p) => {
            const active = selected === p.id;
            return (
              <div className="col-12 mb-3" key={p.id}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => onSelect(p.id)}
                  className={`card border mb-0 w-100 text-start ${active ? "border-primary" : ""}`}
                >
                  <span className="card-body d-block">
                    <span className="d-flex flex-wrap align-items-center gap-2 mb-1">
                      <span className="fw-bold fs-16">{p.title}</span>
                      <span className={`badge ${active ? "badge-primary" : "badge-secondary"}`}>{p.badge}</span>
                    </span>
                    <span className="d-block text-muted fs-14">{p.blurb}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {error ? <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div> : null}

        <div className="d-flex flex-wrap justify-content-between gap-2">
          <button type="button" className="btn btn-primary light" onClick={onBack} disabled={busy}>
            Atrás
          </button>
          <button type="button" className="btn btn-primary" onClick={onNext} disabled={busy}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
