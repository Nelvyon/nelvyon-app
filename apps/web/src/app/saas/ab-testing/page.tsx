"use client";

/**
 * /saas/ab-testing sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Cada test es una caja plegable de la plantilla; sus variantes van en la
 * tabla `table table-responsive-lg table-striped table-condensed flip-content`
 * y la barra de progreso usa el `progress` de Bootstrap que trae W3CRM.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/ab-testing`, los tipos
 * `ABTest`/`ABVariant`, `STATUS_CONFIG`, `TYPE_LABEL`, los mapeos
 * `UI_TO_API_TYPE`/`API_TO_UI_TYPE`, `mapAbTest`, `pct`, el filtro por estado,
 * `declareWinner` y el calculo de confianza media.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmContentBox, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type ABStatus = "running" | "winner" | "paused";
type ABType = "email_subject" | "email_content" | "landing" | "cta";

interface ABVariant {
  id: string; name: string; label: string;
  sent: number; opens: number; clicks: number; conversions: number; winner: boolean;
}

interface ABTest {
  id: string; name: string; type: ABType; status: ABStatus;
  variants: ABVariant[]; splitPercent: number;
  startedAt: string | null; endedAt: string | null;
  winnerMetric: "open_rate" | "click_rate" | "conversion_rate";
  confidence: number | null;
}

const STATUS_CONFIG: Record<ABStatus, { label: string; badge: string; icon: string }> = {
  running: { label: "En ejecución", badge: "badge-success", icon: "▶" },
  winner: { label: "Ganador declarado", badge: "badge-primary", icon: "🏆" },
  paused: { label: "Pausado", badge: "badge-warning", icon: "‖" },
};

const TYPE_LABEL: Record<ABType, string> = {
  email_subject: "Asunto de email", email_content: "Contenido email", landing: "Landing page", cta: "Botón CTA",
};

const UI_TO_API_TYPE: Record<ABType, string> = {
  email_subject: "subject_line", email_content: "content", landing: "content", cta: "from_name",
};

const API_TO_UI_TYPE: Record<string, ABType> = {
  subject_line: "email_subject", send_time: "email_subject", content: "email_content", from_name: "cta",
};

/** Catalogos que pueden crecer sin dejar la pantalla en blanco. */
function estadoDe(s: ABStatus | string) {
  return STATUS_CONFIG[s as ABStatus] ?? { label: String(s || "—"), badge: "badge-secondary", icon: "•" };
}
function tipoDe(t: ABType | string) {
  return TYPE_LABEL[t as ABType] ?? String(t || "—");
}

function mapAbTest(raw: Record<string, unknown>): ABTest {
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  const winnerId = raw.winnerVariantId ?? raw.winner_variant_id;
  const apiStatus = String(raw.status ?? "running");
  const status: ABStatus = apiStatus === "completed" ? "winner" : apiStatus === "paused" ? "paused" : "running";

  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    type: API_TO_UI_TYPE[String(raw.type)] ?? "email_subject",
    status,
    variants: variants.map((v: Record<string, unknown>, i: number) => ({
      id: String(v.id ?? `var_${i}`),
      name: String.fromCharCode(65 + i),
      label: String(v.label ?? v.value ?? ""),
      sent: Number(v.sends ?? v.sent ?? 0),
      opens: Number(v.opens ?? 0),
      clicks: Number(v.clicks ?? 0),
      conversions: 0,
      winner: winnerId != null && String(v.id) === String(winnerId),
    })),
    splitPercent: 50,
    startedAt: raw.createdAt != null ? String(raw.createdAt) : null,
    endedAt: null,
    winnerMetric: "open_rate",
    confidence: raw.confidence != null ? Number(raw.confidence) : null,
  };
}

function pct(n: number, d: number) { return d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—"; }

function CreateAbTestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ABType>("email_subject");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/ab-testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: UI_TO_API_TYPE[type],
          variants: [
            { label: "A", value: variantA.trim() },
            { label: "B", value: variantB.trim() },
          ],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo test A/B" onClose={onClose} error={error} testId="modal-ab">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="ab-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="ab-nombre" type="text" className="form-control" placeholder="Ej: Asunto newsletter Q3"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="ab-tipo" className="text-black font-w600">Tipo</label>
              <select id="ab-tipo" className="form-control" value={type} onChange={(e) => setType(e.target.value as ABType)}>
                {(Object.keys(TYPE_LABEL) as ABType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="ab-a" className="text-black font-w600">Variante A <span className="required">*</span></label>
              <input id="ab-a" type="text" className="form-control" placeholder="Texto variante A"
                value={variantA} onChange={(e) => setVariantA(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="ab-b" className="text-black font-w600">Variante B <span className="required">*</span></label>
              <input id="ab-b" type="text" className="form-control" placeholder="Texto variante B"
                value={variantB} onChange={(e) => setVariantB(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name.trim() || !variantA.trim() || !variantB.trim()}>
                {saving ? "Creando…" : "Crear test"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasABTestingPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [filterStatus, setFilterStatus] = useState<ABStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/ab-testing");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const d = (await res.json().catch(() => ({}))) as { tests?: Record<string, unknown>[] };
      setTests(Array.isArray(d.tests) ? d.tests.map(mapAbTest) : []);
    } catch (e) {
      setTests([]);
      setLoadError(e instanceof Error ? e.message : "Error al cargar tests");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function declareWinner(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/ab-testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "declare_winner", id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al declarar ganador");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = tests.filter((t) => filterStatus === "all" || t.status === filterStatus);
  const completed = tests.filter((t) => t.status === "winner");
  const avgConfidence = completed.length > 0
    ? Math.round(completed.reduce((s, t) => s + (t.confidence ?? 0), 0) / completed.length)
    : null;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="A/B Testing" parentTitle="Gestión" pageTitle="A/B Testing" />
      <div className="container-fluid">
        <div className="row">
          {(loadError || actionError) && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {actionError ?? loadError}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { setActionError(null); setLoadError(null); }} />
              </div>
            </div>
          )}

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Tests activos" value={tests.filter((t) => t.status === "running").length} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Completados" value={completed.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Total variantes" value={tests.reduce((s, t) => s + t.variants.length, 0)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Confianza media" value={avgConfidence != null ? `${avgConfidence}%` : "—"} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Filtro" icono="fas fa-filter" bodyClassName="card-body pb-3">
              <div className="row">
                <div className="col-xl-4 col-sm-6">
                  <label className="visually-hidden" htmlFor="ab-filtro">Estado</label>
                  <select id="ab-filtro" className="form-control" value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as ABStatus | "all")}>
                    <option value="all">Todos los estados</option>
                    {(["running", "winner", "paused"] as const).map((s) => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-xl-4 col-sm-6">
                  <button type="button" className="btn btn-danger light mt-3 mt-xl-0" onClick={() => setFilterStatus("all")}>
                    Quitar filtros
                  </button>
                </div>
              </div>
            </W3crmContentBox>

            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo test</button></li>
              </ul>
            </div>

            {filtered.length === 0 ? (
              <W3crmContentBox titulo="Tests A/B" icono="fa-solid fa-flask">
                <W3crmEmptyState
                  title={tests.length === 0 ? "Sin tests A/B" : "Ningún test en este filtro"}
                  description={tests.length === 0 ? "Crea el primero para empezar a comparar variantes." : "Prueba con otro estado."}
                />
              </W3crmContentBox>
            ) : (
              filtered.map((test) => {
                const sc = estadoDe(test.status);
                return (
                  <W3crmContentBox
                    key={test.id}
                    testId="test-ab"
                    icono="fa-solid fa-flask"
                    titulo={
                      <>
                        {test.name || "—"}
                        <span className={`badge ${sc.badge} ms-2`}>{sc.icon} {sc.label}</span>
                        <span className="badge badge-secondary light ms-1">{tipoDe(test.type)}</span>
                        {test.confidence !== null && (
                          <span className={`ms-2 fs-12 ${test.confidence >= 95 ? "text-success" : "text-warning"}`}>
                            Confianza: {test.confidence}%
                          </span>
                        )}
                      </>
                    }
                    acciones={test.status === "running" ? (
                      <button type="button" className="btn btn-primary btn-sm me-2" disabled={busyId === test.id}
                        onClick={() => void declareWinner(test.id)}>
                        Declarar ganador
                      </button>
                    ) : undefined}
                  >
                    <div className="table-responsive">
                      <div className="dataTables_wrapper no-footer">
                        <table className="table table-responsive-lg table-striped table-condensed flip-content">
                          <thead>
                            <tr>
                              <th className="text-black">Variante</th>
                              <th className="text-black">Texto</th>
                              <th className="text-black">Enviados</th>
                              <th className="text-black">Aperturas</th>
                              <th className="text-black">Clics</th>
                              <th className="text-black">Tasa apertura</th>
                              <th className="text-black text-end">Resultado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {test.variants.map((v) => {
                              const ratio = v.sent > 0 ? (v.opens / v.sent) * 100 : 0;
                              return (
                                <tr key={v.id}>
                                  <td><span className={`badge ${v.winner ? "badge-primary" : "badge-secondary"}`}>{v.name}</span></td>
                                  <td><span className="text-muted fs-12">{v.label || "—"}</span></td>
                                  <td>{v.sent.toLocaleString("es-ES")}</td>
                                  <td>{v.opens.toLocaleString("es-ES")}</td>
                                  <td>{v.clicks.toLocaleString("es-ES")}</td>
                                  <td style={{ minWidth: 140 }}>
                                    <div className="d-flex align-items-center">
                                      <span className="me-2 fw-bold">{pct(v.opens, v.sent)}</span>
                                      <div className="progress flex-grow-1" style={{ height: 6 }}>
                                        <div
                                          className={`progress-bar ${v.winner ? "bg-primary" : "bg-secondary"}`}
                                          style={{ width: `${Math.min(100, ratio * 2)}%` }}
                                          role="progressbar"
                                          aria-valuenow={Math.round(ratio)}
                                          aria-valuemin={0}
                                          aria-valuemax={100}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-end">
                                    {v.winner ? <span className="badge badge-primary">🏆 Ganador</span> : <span className="text-muted">—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </W3crmContentBox>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showModal && <CreateAbTestModal onClose={() => setShowModal(false)} onCreated={() => void load()} />}
    </SaasW3crmShell>
  );
}
