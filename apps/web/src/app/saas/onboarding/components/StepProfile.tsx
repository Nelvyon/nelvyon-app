"use client";

/**
 * Paso 3 con formulario y checks de W3CRM.
 *
 * CONTRATO: `getByText("Paso 3 — Perfil")` como título.
 *
 * SANEADO: `goals` puede llegar con valores fuera del catálogo; se conservan en
 * el estado —no se pierden datos del tenant— y se listan aparte para que el
 * usuario los vea, en vez de desaparecer en silencio.
 */
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
  const seleccionados = Array.isArray(goals) ? goals : [];
  const fueraDeCatalogo = seleccionados.filter((g) => !GOAL_OPTIONS.some((o) => o.id === g));
  // Un rango guardado que ya no esté en la lista dejaba el `select` vacío y se
  // perdía al guardar; se añade como opción para no borrar el dato del tenant.
  const rangos = employees && !EMPLOYEE_RANGES.includes(employees)
    ? [...EMPLOYEE_RANGES, employees]
    : EMPLOYEE_RANGES;

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title">Paso 3 — Perfil</h4>
      </div>
      <div className="card-body">
        <p className="fs-14 text-muted">Datos operativos para adaptar comunicaciones y límites del plan.</p>

        <div className="form-group mb-3">
          <label htmlFor="ob-web" className="text-black font-w600">Sitio web</label>
          <input
            id="ob-web"
            className="form-control"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="https://"
            inputMode="url"
            disabled={busy}
          />
        </div>

        <div className="form-group mb-3">
          <label htmlFor="ob-telefono" className="text-black font-w600">Teléfono</label>
          <input
            id="ob-telefono"
            className="form-control"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            inputMode="tel"
            disabled={busy}
          />
        </div>

        <div className="form-group mb-3">
          <label htmlFor="ob-empleados" className="text-black font-w600">Número de empleados</label>
          <select
            id="ob-empleados"
            className="form-control"
            value={employees}
            onChange={(e) => onEmployeesChange(e.target.value)}
            disabled={busy}
          >
            <option value="">Selecciona…</option>
            {rangos.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <fieldset className="mb-3">
          <legend className="text-black font-w600 fs-14">Objetivos (elige los que apliquen)</legend>
          <div className="row">
            {GOAL_OPTIONS.map((g) => {
              const checked = seleccionados.includes(g.id);
              return (
                <div className="col-sm-6" key={g.id}>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`ob-goal-${g.id}`}
                      checked={checked}
                      disabled={busy}
                      onChange={() => onToggleGoal(g.id)}
                    />
                    <label className="form-check-label" htmlFor={`ob-goal-${g.id}`}>{g.label}</label>
                  </div>
                </div>
              );
            })}
          </div>
          {fueraDeCatalogo.length > 0 && (
            <p className="fs-12 text-muted mb-0">
              Otros objetivos guardados: {fueraDeCatalogo.join(", ")}
            </p>
          )}
        </fieldset>

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
