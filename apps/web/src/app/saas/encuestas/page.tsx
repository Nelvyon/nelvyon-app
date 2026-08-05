"use client";

/**
 * /saas/encuestas sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Cada encuesta es una caja plegable cuyo cuerpo son sus preguntas; compartir
 * y ver respuestas usan el `<Modal>` de la plantilla.
 *
 * Logica de NELVYON intacta: `GET /api/saas/surveys`,
 * `GET ?id=&responses=true`, el `POST` con sus acciones (`update`,
 * `enable_share`, `disable_share`) y el `DELETE`; los tipos `Survey`,
 * `SurveyQuestion` y `SurveyResponse`, `QUESTION_TEMPLATES` por tipo,
 * `Q_ICON`, el calculo de NPS medio y el copiado del enlace publico.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type QuestionType = "rating" | "nps" | "text" | "multiple_choice" | "checkbox";
type SurveyType = "survey" | "nps" | "feedback" | "quiz";

interface SurveyQuestion {
  id: string; type: QuestionType; label: string; required: boolean;
  options?: string[]; scale?: number;
}

interface Survey {
  id: string; name: string; type: SurveyType; active: boolean;
  questions: SurveyQuestion[]; responsesCount: number; npsScore: number | null; createdAt: string;
}

interface SurveyResponse {
  id: string; answers: Record<string, unknown>; score: number | null; completedAt: string;
}

const Q_ICON: Record<QuestionType, string> = {
  rating: "⭐", nps: "📊", text: "T", multiple_choice: "☑", checkbox: "☑",
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}
/** Preguntas puede llegar nulo o no-array desde el backend. */
function preguntasDe(s: Survey): SurveyQuestion[] {
  return Array.isArray(s.questions) ? s.questions : [];
}
/** Un tipo de pregunta fuera de catalogo no puede romper el render. */
function iconoPregunta(t: QuestionType | string) {
  return Q_ICON[t as QuestionType] ?? String(t || "•");
}

const QUESTION_TEMPLATES: Record<SurveyType, SurveyQuestion[]> = {
  nps: [{ id: "q1", type: "nps", label: "¿Con qué probabilidad nos recomendarías a un amigo o colega?", required: true }],
  feedback: [
    { id: "q1", type: "rating", label: "¿Cómo valorarías tu experiencia?", required: true, scale: 5 },
    { id: "q2", type: "text", label: "¿Qué podríamos mejorar?", required: false },
  ],
  survey: [{ id: "q1", type: "text", label: "¿Cuál es tu opinión sobre nuestro servicio?", required: true }],
  quiz: [{ id: "q1", type: "multiple_choice", label: "Pregunta de ejemplo", required: true, options: ["Opción A", "Opción B", "Opción C"] }],
};

function ShareModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com";

  async function enable() {
    setEnabling(true);
    setError(null);
    try {
      const r = await fetch("/api/saas/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable_share", id: survey.id }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${r.status}`);
      }
      const d = (await r.json().catch(() => ({}))) as { slug?: string };
      setLink(d.slug ? `${origin}/s/${d.slug}` : null);
      if (!d.slug) setError("El servidor no devolvió un enlace.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar enlace");
    } finally {
      setEnabling(false);
    }
  }

  async function disable() {
    setDisabling(true);
    setError(null);
    try {
      const r = await fetch("/api/saas/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable_share", id: survey.id }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${r.status}`);
      }
      setLink(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al revocar enlace");
    } finally {
      setDisabling(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <W3crmModal titulo="Compartir encuesta" onClose={onClose} error={error} testId="modal-compartir">
      <p className="fs-14 text-muted">
        Genera un enlace público para que tus clientes completen la encuesta.
      </p>
      {!link ? (
        <div className="text-end">
          <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={() => void enable()} disabled={enabling}>
            {enabling ? "Generando…" : "Generar enlace público"}
          </button>
        </div>
      ) : (
        <>
          <pre className="border rounded p-3 fs-12 text-break mb-3">{link}</pre>
          <div className="text-end">
            <button type="button" className="btn btn-danger light me-2" disabled={disabling} onClick={() => void disable()}>
              {disabling ? "Revocando…" : "Revocar enlace"}
            </button>
            <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cerrar</button>
            <button type="button" className="btn btn-primary" onClick={() => void copy()}>
              {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
          </div>
        </>
      )}
    </W3crmModal>
  );
}

function ResponsesPanel({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/saas/surveys?id=${survey.id}&responses=true`);
      if (r.ok) {
        const d = (await r.json().catch(() => ({}))) as { responses?: SurveyResponse[] };
        setResponses(Array.isArray(d.responses) ? d.responses : []);
      }
      setLoading(false);
    })();
  }, [survey.id]);

  const preguntas = preguntasDe(survey);

  return (
    <W3crmModal titulo={`Respuestas — ${survey.name}`} onClose={onClose} size="lg" testId="modal-respuestas">
      {loading ? (
        <W3crmCargando texto="Cargando respuestas…" />
      ) : responses.length === 0 ? (
        <W3crmEmptyState title="Sin respuestas todavía" />
      ) : (
        <div className="table-responsive">
          <div className="dataTables_wrapper no-footer">
            <table className="table table-responsive-lg table-striped table-condensed flip-content">
              <thead>
                <tr>
                  <th className="text-black">Fecha</th>
                  <th className="text-black">Score</th>
                  <th className="text-black">Respuestas</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id}>
                    <td>{fecha(r.completedAt)}</td>
                    <td>{r.score != null ? <span className="badge badge-primary">{r.score}</span> : <span className="text-muted">—</span>}</td>
                    <td>
                      {Object.entries(r.answers ?? {}).map(([qId, ans]) => {
                        const q = preguntas.find((x) => x.id === qId);
                        return (
                          <div key={qId} className="fs-12">
                            <span className="text-muted">{q?.label ?? qId}: </span>
                            <span>{Array.isArray(ans) ? ans.join(", ") : String(ans)}</span>
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </W3crmModal>
  );
}

function CreateSurveyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SurveyType>("nps");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/saas/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, questions: QUESTION_TEMPLATES[type] }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${r.status}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear encuesta");
    } finally {
      setSaving(false);
    }
  }

  const TYPES: { value: SurveyType; label: string; desc: string }[] = [
    { value: "nps", label: "NPS", desc: "Net Promoter Score 0-10" },
    { value: "feedback", label: "CSAT", desc: "Satisfacción con puntuación y comentario" },
    { value: "survey", label: "Encuesta", desc: "Preguntas abiertas personalizadas" },
    { value: "quiz", label: "Quiz", desc: "Respuesta múltiple" },
  ];

  return (
    <W3crmModal titulo="Nueva encuesta" onClose={onClose} error={error} testId="modal-encuesta">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <div className="row">
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="enc-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="enc-nombre" ref={nameRef} type="text" className="form-control" required
                placeholder="Encuesta NPS — Junio 2026"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="enc-tipo" className="text-black font-w600">Tipo</label>
              <select id="enc-tipo" className="form-control" value={type} onChange={(e) => setType(e.target.value as SurveyType)}>
                {TYPES.map(({ value, label, desc }) => (
                  <option key={value} value={value}>{label} — {desc}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                {saving ? "Creando…" : "Crear encuesta"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasEncuestasPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [shareSurvey, setShareSurvey] = useState<Survey | null>(null);
  const [responsesSurvey, setResponsesSurvey] = useState<Survey | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/surveys");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json().catch(() => ({}))) as { surveys?: Survey[] };
      setSurveys(Array.isArray(d.surveys) ? d.surveys : []);
    } catch (err) {
      setSurveys([]);
      setError(err instanceof Error ? err.message : "Error al cargar encuestas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleActivate(survey: Survey, active: boolean) {
    setActionError(null);
    try {
      const res = await fetch("/api/saas/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: survey.id, active }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al actualizar encuesta");
    }
  }

  async function handleDelete(survey: Survey) {
    const r = await Alert.fire({
      title: `¿Eliminar la encuesta "${survey.name}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/surveys?id=${encodeURIComponent(survey.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al eliminar encuesta");
    }
  }

  const withNps = surveys.filter((s) => s.npsScore !== null && s.npsScore !== undefined);
  const stats = {
    active: surveys.filter((s) => s.active).length,
    responses: surveys.reduce((s, sv) => s + num(sv.responsesCount), 0),
    avgNps: withNps.length > 0
      ? Math.round(withNps.reduce((s, sv) => s + num(sv.npsScore), 0) / withNps.length)
      : 0,
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Encuestas" parentTitle="Gestión" pageTitle="Encuestas" />
      <div className="container-fluid">
        <div className="row">
          {(error || actionError) && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error ?? actionError}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { const habiaError = !!error; setError(null); setActionError(null); if (habiaError) void load(); }} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Encuestas activas" value={stats.active} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Respuestas totales" value={stats.responses.toLocaleString("es-ES")} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="NPS medio (encuestas)" value={withNps.length > 0 ? stats.avgNps : "—"} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nueva encuesta</button></li>
              </ul>
            </div>

            {loading ? (
              <W3crmContentBox titulo="Encuestas" icono="fa-solid fa-clipboard-list">
                <W3crmCargando texto="Cargando encuestas…" />
              </W3crmContentBox>
            ) : surveys.length === 0 ? (
              <W3crmContentBox titulo="Encuestas" icono="fa-solid fa-clipboard-list">
                <W3crmEmptyState title="Sin encuestas todavía" description="Crea tu primera encuesta de NPS o satisfacción." />
              </W3crmContentBox>
            ) : (
              surveys.map((s) => {
                const preguntas = preguntasDe(s);
                return (
                  <W3crmContentBox
                    key={s.id}
                    testId="encuesta"
                    icono="fa-solid fa-clipboard-list"
                    defaultOpen={false}
                    titulo={
                      <>
                        {s.name || "—"}
                        <span className={`badge ${s.active ? "badge-success" : "badge-primary"} ms-2`}>
                          {s.active ? "Activa" : "Borrador"}
                        </span>
                        <span className="text-muted fs-12 ms-2">
                          {preguntas.length} preguntas · {num(s.responsesCount)} respuestas
                        </span>
                        {s.npsScore != null && (
                          <span className={`ms-2 fw-bold ${num(s.npsScore) >= 50 ? "text-success" : num(s.npsScore) >= 0 ? "text-warning" : "text-danger"}`}>
                            NPS {num(s.npsScore)}
                          </span>
                        )}
                      </>
                    }
                    acciones={
                      <>
                        {s.active && (
                          <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => setShareSurvey(s)}>
                            Compartir enlace
                          </button>
                        )}
                        <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => setResponsesSurvey(s)}>
                          Ver respuestas
                        </button>
                        {!s.active ? (
                          <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => void handleActivate(s, true)}>Activar</button>
                        ) : (
                          <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => void handleActivate(s, false)}>Desactivar</button>
                        )}
                        <button type="button" className="btn btn-danger light btn-sm me-2" onClick={() => void handleDelete(s)}>Eliminar</button>
                      </>
                    }
                  >
                    {preguntas.length === 0 ? (
                      <W3crmEmptyState title="Sin preguntas" description="Esta encuesta todavía no tiene preguntas." />
                    ) : (
                      <div className="table-responsive">
                        <div className="dataTables_wrapper no-footer">
                          <table className="table table-responsive-lg table-striped table-condensed flip-content">
                            <thead>
                              <tr>
                                <th className="text-black">#</th>
                                <th className="text-black">Tipo</th>
                                <th className="text-black">Pregunta</th>
                                <th className="text-black">Opciones</th>
                                <th className="text-black text-end">Obligatoria</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preguntas.map((q, i) => (
                                <tr key={q.id}>
                                  <td>{i + 1}</td>
                                  <td><span className="badge badge-secondary light">{iconoPregunta(q.type)}</span></td>
                                  <td>{q.label || "—"}</td>
                                  <td>
                                    {Array.isArray(q.options) && q.options.length > 0
                                      ? q.options.map((o) => <span key={o} className="badge badge-secondary light me-1 fs-12">{o}</span>)
                                      : <span className="text-muted">—</span>}
                                  </td>
                                  <td className="text-end">
                                    {q.required ? <span className="badge badge-danger">Sí</span> : <span className="text-muted">No</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </W3crmContentBox>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showCreate && <CreateSurveyModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {shareSurvey && <ShareModal survey={shareSurvey} onClose={() => setShareSurvey(null)} />}
      {responsesSurvey && <ResponsesPanel survey={responsesSurvey} onClose={() => setResponsesSurvey(null)} />}
    </SaasW3crmShell>
  );
}
