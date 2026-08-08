"use client";

/**
 * /saas/brief-to-launch sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: cada paso del wizard -> `W3crmContentBox`; lanzamientos
 * recientes -> `W3crmDataTable`; espera -> `W3crmCargando`. El stepper
 * conserva su marcado propio porque no hay patron equivalente en la plantilla
 * y los textos son contrato. Sin componentes nuevos.
 *
 * CONTRATO — `saas-brief-to-launch.spec.ts` exige, y aqui se conserva:
 *   - `getByText("Lanzar Pack IA")` UNICO (l.22). `W3crmPageTitle` pinta
 *     `mainTitle` y `pageTitle`: el segundo NO puede repetir ese texto, o
 *     serian dos coincidencias. Por eso `pageTitle="Brief to Launch"`.
 *   - `1. Pack` y `2. Brief` (l.27-28): el stepper mantiene esa numeracion
 *     literal y los cuatro rotulos.
 *   - `Crecimiento Local` como TEXTO (l.33) y como `getByRole("button")`
 *     (l.74): las tarjetas de pack siguen siendo `<button>` con el nombre
 *     dentro. Ninguna caja se titula con el nombre de un pack, porque el
 *     toggle de `W3crmContentBox` expone `aria-label="Plegar <titulo>"` y
 *     seria un segundo boton con ese nombre accesible.
 *   - `/Continuar con/i` (l.76) y `Pack en beta` (l.83).
 *   - `Brief del proyecto` (l.90): se conserva como titulo de caja. Aqui si
 *     vale, porque el spec lo busca con `getByText` y el toggle solo aporta un
 *     `role="button"`, no texto.
 *   - `getByRole("button", { name: /Lanzar pack/i })` deshabilitado con el
 *     brief incompleto (l.97). El regex es case-insensitive, asi que ninguna
 *     caja puede titularse con "lanzar pack" en ninguna capitalizacion.
 *   - `getByRole("link", { name: /Lanzar Pack/i })` del sidebar (l.38). A
 *     diferencia del caso de `/saas/autopilot`, aqui ese enlace ES visible:
 *     el grupo que lo contiene es el del item activo, asi que el sidebar lo
 *     despliega.
 *
 * Logica de NELVYON intacta: `GET /api/saas/brief-to-launch` (packs +
 * launches), `POST` con `{ packId, brief }`, y el polling de
 * `GET /api/saas/brief-to-launch/[id]` cada 3 s hasta `completed`/`failed`;
 * la preseleccion por `?packId=` que salta directamente al paso de brief; los
 * tres mapas de campos por pack mas el juego por defecto; `briefIsValid` con
 * sus campos obligatorios; el bloqueo de los packs en beta; el `reset`
 * completo; y la limpieza del intervalo al desmontar.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";
import type { AvailablePackDef, PackLaunch, LaunchStatusDetail } from "@nelvyon/saas";

type WizardStep = "select" | "brief" | "running" | "done";

const STEP_LABELS = ["1. Pack", "2. Brief", "3. Ejecutando", "4. Resultado"];
const STEP_ORDER: WizardStep[] = ["select", "brief", "running", "done"];

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** El ancho de la barra no puede salirse con datos corruptos. */
function pct(v: unknown): number {
  return Math.min(100, Math.max(0, Math.round(num(v))));
}

const LAUNCH_BADGE: Record<string, string> = {
  completed: "badge-success",
  failed: "badge-danger",
};
/** Un estado fuera de catalogo se pinta neutro, no `undefined`. */
function launchBadge(s: string): string {
  return LAUNCH_BADGE[s] ?? "badge-warning";
}

function PackCard({ pack, selected, onSelect }: {
  pack: AvailablePackDef; selected: boolean; onSelect: () => void;
}) {
  const isBeta = pack.availability === "beta";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`card border w-100 text-start mb-3 h-100 ${selected ? "border-primary" : ""}`}
    >
      <div className="card-body position-relative">
        {isBeta ? <span className="badge badge-warning position-absolute top-0 end-0 m-3">BETA</span> : null}
        <span className="fw-bold d-block">{pack.name}</span>
        <span className="text-muted fs-12 d-block mt-1">{pack.tagline}</span>
        <span className="text-muted fs-12 d-block mt-3">~{num(pack.estimatedMinutes)} min</span>
      </div>
    </button>
  );
}

const BRIEF_FIELDS: Record<string, { key: string; label: string; placeholder: string; required?: boolean }[]> = {
  "local-business-growth": [
    { key: "business_name", label: "Nombre del negocio", placeholder: "La Pizzería Napoli", required: true },
    { key: "city", label: "Ciudad", placeholder: "Madrid", required: true },
    { key: "value_proposition", label: "¿Qué te diferencia?", placeholder: "La mejor pizza napolitana del barrio", required: true },
    { key: "primary_cta", label: "CTA principal", placeholder: "Reservar mesa", required: true },
    { key: "contact_email", label: "Email de contacto", placeholder: "hola@negocio.com" },
  ],
  "ecommerce-growth": [
    { key: "business_name", label: "Nombre de marca", placeholder: "ModaVerde DTC", required: true },
    { key: "city", label: "Ciudad / Mercado", placeholder: "España", required: true },
    { key: "value_proposition", label: "Categoría de producto", placeholder: "Moda sostenible femenina", required: true },
    { key: "primary_cta", label: "Canal principal", placeholder: "Meta Ads", required: true },
    { key: "contact_email", label: "Email de contacto", placeholder: "hola@marca.com" },
  ],
  "saas-b2b-growth": [
    { key: "business_name", label: "Nombre del producto", placeholder: "FlowMetrics", required: true },
    { key: "city", label: "Mercado objetivo", placeholder: "Europa", required: true },
    { key: "value_proposition", label: "ICP / Cargo objetivo", placeholder: "VP Engineering", required: true },
    { key: "primary_cta", label: "Motion comercial", placeholder: "Trial PLG", required: true },
    { key: "contact_email", label: "Email de contacto", placeholder: "hola@saas.com" },
  ],
};

const DEFAULT_FIELDS = [
  { key: "business_name", label: "Nombre del negocio / proyecto", placeholder: "Acme Corp", required: true },
  { key: "city", label: "Ciudad / Mercado", placeholder: "Madrid", required: true },
  { key: "value_proposition", label: "Propuesta de valor", placeholder: "¿Qué te diferencia?", required: true },
  { key: "primary_cta", label: "Objetivo principal", placeholder: "Generar leads", required: true },
  { key: "contact_email", label: "Email de contacto", placeholder: "hola@empresa.com" },
];

function BriefForm({ packId, values, onChange }: {
  packId: string; values: Record<string, string>; onChange: (key: string, value: string) => void;
}) {
  const fields = BRIEF_FIELDS[packId] ?? DEFAULT_FIELDS;
  return (
    <>
      {fields.map((f) => (
        <div className="form-group mb-3" key={f.key}>
          <label htmlFor={`bl-${f.key}`} className="text-black font-w600">
            {f.label} {f.required ? <span className="required">*</span> : null}
          </label>
          <input
            id={`bl-${f.key}`}
            className="form-control"
            type={f.key === "contact_email" ? "email" : "text"}
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
          />
        </div>
      ))}
    </>
  );
}

function briefIsValid(packId: string, values: Record<string, string>): boolean {
  const fields = BRIEF_FIELDS[packId] ?? DEFAULT_FIELDS;
  return fields.filter((f) => f.required).every((f) => (values[f.key] ?? "").trim().length > 0);
}

export default function BriefToLaunchPage() {
  const [packs, setPacks] = useState<AvailablePackDef[]>([]);
  const [recentLaunches, setRecentLaunches] = useState<PackLaunch[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<WizardStep>("select");
  const [selectedPack, setSelectedPack] = useState<AvailablePackDef | null>(null);
  const [briefValues, setBriefValues] = useState<Record<string, string>>({});
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<LaunchStatusDetail | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [_currentLaunchId, setCurrentLaunchId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void fetch("/api/saas/brief-to-launch")
      .then((r) => (r.ok ? r.json() : { packs: [], launches: [] }))
      .then((d) => {
        // `packs` y `launches` podian no ser array y reventaban `.map`/`.find`.
        const loaded = (Array.isArray(d?.packs) ? d.packs : []) as AvailablePackDef[];
        setPacks(loaded);
        setRecentLaunches((Array.isArray(d?.launches) ? d.launches : []) as PackLaunch[]);
        const preselectId = new URLSearchParams(window.location.search).get("packId");
        if (preselectId) {
          const match = loaded.find((p) => p.id === preselectId);
          if (match) {
            setSelectedPack(match);
            setStep("brief");
          }
        }
      })
      .catch(() => { /* silent: la pantalla se queda en el paso 1 vacio */ })
      .finally(() => setLoading(false));
  }, []);

  const pollStatus = useCallback(async (launchId: string) => {
    try {
      const res = await fetch(`/api/saas/brief-to-launch/${launchId}`);
      if (!res.ok) return;
      const d = (await res.json().catch(() => ({}))) as { launch?: LaunchStatusDetail };
      if (!d.launch) return;
      setLaunchResult(d.launch);
      if (d.launch.status === "completed" || d.launch.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("done");
        setLaunching(false);
        if (d.launch.status === "failed") {
          setLaunchError(d.launch.errorMessage ?? "Error desconocido");
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleLaunch() {
    if (!selectedPack || !briefIsValid(selectedPack.id, briefValues)) return;
    setLaunching(true);
    setLaunchError(null);
    setStep("running");

    try {
      const res = await fetch("/api/saas/brief-to-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: selectedPack.id, brief: briefValues }),
      });
      const d = (await res.json().catch(() => ({}))) as { launch?: PackLaunch; error?: string };
      // Sin `id` no hay nada que sondear: se vuelve al brief con el error.
      if (!res.ok || !d.launch?.id) {
        setLaunchError(d.error ?? "Error al lanzar el pack");
        setStep("brief");
        setLaunching(false);
        return;
      }
      const launchId = d.launch.id;
      setCurrentLaunchId(launchId);
      pollRef.current = setInterval(() => { void pollStatus(launchId); }, 3000);
      void pollStatus(launchId);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Error de red");
      setStep("brief");
      setLaunching(false);
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep("select");
    setSelectedPack(null);
    setBriefValues({});
    setLaunchResult(null);
    setLaunchError(null);
    setCurrentLaunchId(null);
    setLaunching(false);
  }

  const isBeta = selectedPack?.availability === "beta";
  const pasos = Array.isArray(launchResult?.steps) ? launchResult.steps : [];
  const progreso = pct(launchResult?.progressPct);

  return (
    <SaasW3crmShell>
      {/* `pageTitle` NO repite "Lanzar Pack IA": el spec lo busca con
          `getByText` y serian dos coincidencias. */}
      <W3crmPageTitle mainTitle="Lanzar Pack IA" parentTitle="Inteligencia" pageTitle="Brief to Launch" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Elige un pack, completa el brief y el motor IA entregará los activos en minutos.
            </p>

            {/* Stepper: los cuatro rotulos son contrato literal. */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3" aria-label="Progreso del asistente">
              {STEP_ORDER.map((s, i) => {
                const actual = step === s;
                const pasado = i < STEP_ORDER.indexOf(step);
                return (
                  <span key={s} className="d-flex align-items-center gap-2">
                    {i > 0 ? <span className="text-muted">→</span> : null}
                    <span
                      className={`fs-14 fw-bold ${actual ? "text-primary" : pasado ? "text-success" : "text-muted"}`}
                      aria-current={actual ? "step" : undefined}
                    >
                      {STEP_LABELS[i]}
                    </span>
                  </span>
                );
              })}
            </div>

            {step === "select" && (
              <>
                {/* Titulo sin nombre de pack ni "lanzar pack": ver cabecera. */}
                <W3crmContentBox titulo="Elige tu pack" icono="fa-solid fa-box-open">
                  {loading ? (
                    <W3crmCargando texto="Cargando packs…" />
                  ) : packs.length === 0 ? (
                    <W3crmEmptyState
                      title="Sin packs disponibles"
                      description="No hay packs publicados para tu cuenta ahora mismo."
                    />
                  ) : (
                    <div className="row">
                      {packs.map((p) => (
                        <div className="col-xl-6" key={p.id}>
                          <PackCard
                            pack={p}
                            selected={selectedPack?.id === p.id}
                            onSelect={() => { setSelectedPack(p); setBriefValues({}); }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedPack && (
                    isBeta ? (
                      <div className="alert alert-warning" role="status">
                        <strong>Pack en beta</strong>
                        <p className="mb-0 fs-12 mt-1">
                          Este pack está en acceso anticipado. Puedes registrar tu interés y te
                          avisaremos cuando esté disponible para ejecución automática.
                        </p>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-primary w-100" onClick={() => setStep("brief")}>
                        Continuar con {selectedPack.name} →
                      </button>
                    )
                  )}
                </W3crmContentBox>

                {recentLaunches.length > 0 && (
                  <W3crmContentBox titulo="Lanzamientos recientes" icono="fa-solid fa-clock-rotate-left">
                    <W3crmDataTable
                      filas={recentLaunches.slice(0, 5)}
                      etiqueta="lanzamientos"
                      wrapperId="launches_wrapper"
                      porPagina={5}
                      columnas={[{ titulo: "Pack" }, { titulo: "Estado", alFinal: true }]}
                      render={(l) => (
                        <tr key={l.id}>
                          <td><span className="fw-bold">{l.packId || "—"}</span></td>
                          <td className="text-end">
                            <span className={`badge ${launchBadge(l.status)}`}>{l.status || "—"}</span>
                          </td>
                        </tr>
                      )}
                    />
                  </W3crmContentBox>
                )}
              </>
            )}

            {step === "brief" && selectedPack && (
              <W3crmContentBox
                titulo="Brief del proyecto"
                icono="fa-solid fa-clipboard-list"
                acciones={
                  <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => setStep("select")}>
                    ← Cambiar pack
                  </button>
                }
              >
                <p className="fs-14 text-muted">
                  <span className="fw-bold text-black">{selectedPack.name}</span> · {selectedPack.tagline}
                </p>

                <BriefForm
                  packId={selectedPack.id}
                  values={briefValues}
                  onChange={(key, val) => setBriefValues((prev) => ({ ...prev, [key]: val }))}
                />

                {launchError && <div className="alert alert-danger py-2 fs-14" role="alert">{launchError}</div>}

                <button
                  type="button"
                  className="btn btn-primary w-100"
                  disabled={launching || !briefIsValid(selectedPack.id, briefValues)}
                  onClick={() => { void handleLaunch(); }}
                >
                  {launching ? "Lanzando…" : "Lanzar pack"}
                </button>

                <p className="fs-12 text-muted text-center mt-2 mb-0">
                  El motor IA ejecutará el pack (~{num(selectedPack.estimatedMinutes)} min). Puedes cerrar esta pestaña.
                </p>
              </W3crmContentBox>
            )}

            {step === "running" && (
              <W3crmContentBox titulo="Ejecución en curso" icono="fa-solid fa-gears">
                <div className="text-center">
                  <p className="fw-bold mb-1">Ejecutando {selectedPack?.name ?? "el pack"}…</p>
                  <p className="text-muted fs-14">El motor IA está generando tus activos</p>
                  <div className="progress mx-auto" style={{ height: 8, maxWidth: 320 }}>
                    <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${progreso}%` }}
                      aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100}
                      aria-label="Progreso de la ejecución" />
                  </div>
                  <p className="text-muted fs-12 mt-2">{progreso}% completado</p>
                </div>

                {pasos.length > 0 && (
                  <ul className="list-group list-group-flush mx-auto" style={{ maxWidth: 420 }}>
                    {pasos.map((s) => (
                      <li key={s.key} className="list-group-item d-flex align-items-center gap-2 px-0">
                        <span className={`badge ${
                          s.status === "done" ? "badge-success"
                            : s.status === "running" ? "badge-primary"
                              : s.status === "failed" ? "badge-danger" : "badge-secondary"
                        }`}>
                          {s.status === "done" ? "OK" : s.status === "running" ? "…" : s.status === "failed" ? "✕" : "○"}
                        </span>
                        <span className={s.status === "done" ? "text-muted" : ""}>{s.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </W3crmContentBox>
            )}

            {step === "done" && launchResult && (
              <W3crmContentBox titulo="Resultado" icono="fa-solid fa-flag-checkered">
                {launchResult.status === "failed" ? (
                  <div className="text-center">
                    <div className="alert alert-danger" role="alert">
                      <strong>El pack falló</strong>
                      <p className="mb-0 fs-14 mt-1">{launchResult.errorMessage ?? "Error desconocido"}</p>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={reset}>Intentar de nuevo</button>
                  </div>
                ) : (
                  <>
                    <div className="alert alert-success text-center" role="status">
                      <strong>{selectedPack?.name ?? "El pack"} completado</strong>
                      {launchResult.qaScore !== null && launchResult.qaScore !== undefined ? (
                        <p className={`mb-0 fw-bold mt-1 ${num(launchResult.qaScore) >= 85 ? "text-success" : "text-warning"}`}>
                          QA Score: {num(launchResult.qaScore)}%
                        </p>
                      ) : null}
                    </div>

                    <div className="row">
                      <div className="col-sm-4">
                        <Link href="/saas/entregables" className="btn btn-primary light w-100 mb-2">
                          Ver Entregables
                        </Link>
                      </div>
                      {launchResult.portalUrl ? (
                        <div className="col-sm-4">
                          <a href={launchResult.portalUrl} target="_blank" rel="noopener noreferrer"
                            className="btn btn-primary w-100 mb-2">
                            Abrir Portal
                          </a>
                        </div>
                      ) : null}
                      <div className="col-sm-4">
                        <Link href="/saas/reportes" className="btn btn-primary light w-100 mb-2">
                          Ver Informe CEO
                        </Link>
                      </div>
                    </div>

                    <button type="button" className="btn btn-primary light w-100" onClick={reset}>
                      Lanzar otro pack
                    </button>
                  </>
                )}
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
