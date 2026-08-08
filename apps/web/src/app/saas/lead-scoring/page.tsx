"use client";

/**
 * /saas/lead-scoring sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: leads y reglas -> `W3crmContentBox`; la tabla de reglas ->
 * `W3crmDataTable`; el alta -> `W3crmModal`; los grados -> `W3crmKpiTile`.
 * Sin componentes nuevos.
 *
 * SANEADO — "protege métricas y catálogos desconocidos": TODOS los diccionarios
 * (`FIELD_LABELS`, `OP_LABELS`, `CAT_LABEL`, `CAT_BADGE`, `GRADE_*`) se leen con
 * salida por defecto, de modo que un campo, operador, categoría o grado que el
 * backend añada mañana se pinta con su clave en crudo en vez de dejar la celda
 * vacía o el badge sin clase. El recuento por grado solo suma grados del
 * catálogo, así que un valor desconocido ya no crea claves fantasma. `rules`,
 * `scores` y `reasons` se validan como array antes de recorrerlos, y la barra
 * de progreso no divide por un máximo no numérico.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/lead-scoring` con sus tres
 * `resource` (`rules`, `scores`, `max-score`) y `POST` con las cuatro acciones
 * —alta de regla, `update-rule`, `delete-rule` y `score-contact`—.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

type RuleField    = "contact.has_email" | "contact.has_phone" | "contact.has_company" | "contact.has_notes" | "contact.status" | "contact.pipeline_stage" | "contact.email_opens" | "contact.email_clicks" | "contact.activity_count" | "contact.value";
type RuleOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "not_contains" | "is_true" | "is_false";
type RuleCategory = "demographic" | "behavioral" | "engagement" | "firmographic";
type LeadGrade    = "A" | "B" | "C" | "D";
type LeadCategory = "hot" | "warm" | "cold";

interface ScoringRule {
  id: string; name: string; field: RuleField; operator: RuleOperator; value: string;
  points: number; category: RuleCategory; active: boolean;
}
interface LeadScore {
  id: string; contactId: string; contactName: string; contactEmail: string; contactCompany: string | null;
  score: number; grade: LeadGrade; category: LeadCategory;
  reasons: string[]; scoredAt: string;
}

const GRADES: LeadGrade[] = ["A", "B", "C", "D"];
const GRADE_TEXTO: Record<string, string> = { A: "text-success", B: "text-primary", C: "text-warning", D: "text-danger" };
const GRADE_BADGE: Record<string, string> = { A: "badge-success", B: "badge-primary", C: "badge-warning", D: "badge-danger" };
const CAT_LABEL: Record<string, string> = {
  demographic: "Demográfico", behavioral: "Comportamiento",
  engagement: "Engagement", firmographic: "Firmográfico",
};
const CAT_BADGE: Record<string, string> = {
  hot: "badge-success", warm: "badge-warning", cold: "badge-danger",
};
const CAT_TEXTO: Record<string, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };
const FIELD_LABELS: Record<string, string> = {
  "contact.has_email": "Tiene email", "contact.has_phone": "Tiene teléfono",
  "contact.has_company": "Tiene empresa", "contact.has_notes": "Tiene notas",
  "contact.status": "Estado", "contact.pipeline_stage": "Etapa pipeline",
  "contact.email_opens": "Emails abiertos", "contact.email_clicks": "Clics en email",
  "contact.activity_count": "Actividades totales", "contact.value": "Valor contacto",
};
const OP_LABELS: Record<string, string> = {
  equals: "=", not_equals: "≠", greater_than: ">", less_than: "<",
  contains: "contiene", not_contains: "no contiene", is_true: "es verdadero", is_false: "es falso",
};

function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
/** Catálogo desconocido: se muestra la clave, nunca un hueco. */
function etiqueta(dicc: Record<string, string>, clave: unknown): string {
  const k = txt(clave);
  return dicc[k] ?? (k || "—");
}

// --- Rule Create Modal ---
function RuleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [field, setField] = useState<RuleField>("contact.has_email");
  const [operator, setOperator] = useState<RuleOperator>("is_true");
  const [value, setValue] = useState("");
  const [points, setPoints] = useState(10);
  const [category, setCategory] = useState<RuleCategory>("engagement");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const booleanField = field.startsWith("contact.has_");
  const numericField = ["contact.email_opens","contact.email_clicks","contact.activity_count","contact.value"].includes(field);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nombre obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/lead-scoring", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), field, operator, value, points, category }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear regla"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Nueva regla de scoring" onClose={onClose} error={error}>
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="ls-nombre" className="text-black font-w600">
            Nombre <span className="required">*</span>
          </label>
          <input id="ls-nombre" className="form-control" autoFocus placeholder="Abrió email"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="row">
          <div className="col-sm-6">
            <div className="form-group mb-3">
              <label htmlFor="ls-campo" className="text-black font-w600">Campo</label>
              <select id="ls-campo" className="form-control" value={field}
                onChange={e => { setField(e.target.value as RuleField); setOperator(e.target.value.startsWith("contact.has_") ? "is_true" : "equals"); }}>
                {Object.entries(FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="col-sm-6">
            <div className="form-group mb-3">
              <label htmlFor="ls-categoria" className="text-black font-w600">Categoría</label>
              <select id="ls-categoria" className="form-control" value={category}
                onChange={e => setCategory(e.target.value as RuleCategory)}>
                {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="col-sm-6">
            <div className="form-group mb-3">
              <label htmlFor="ls-operador" className="text-black font-w600">Operador</label>
              <select id="ls-operador" className="form-control" value={operator}
                onChange={e => setOperator(e.target.value as RuleOperator)}>
                {booleanField
                  ? [<option key="is_true" value="is_true">es verdadero</option>, <option key="is_false" value="is_false">es falso</option>]
                  : numericField
                    ? [<option key="gt" value="greater_than">&gt;</option>, <option key="lt" value="less_than">&lt;</option>, <option key="eq" value="equals">=</option>]
                    : [<option key="eq" value="equals">=</option>, <option key="neq" value="not_equals">≠</option>, <option key="con" value="contains">contiene</option>]
                }
              </select>
            </div>
          </div>
          {!booleanField && (
            <div className="col-sm-6">
              <div className="form-group mb-3">
                <label htmlFor="ls-valor" className="text-black font-w600">Valor</label>
                <input id="ls-valor" className="form-control" placeholder={numericField ? "5" : "qualified"}
                  value={value} onChange={e => setValue(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="form-group mb-3">
          <label htmlFor="ls-puntos" className="text-black font-w600">Puntos (negativo = penalización)</label>
          <input id="ls-puntos" type="number" className="form-control" value={points}
            onChange={e => setPoints(Number(e.target.value))} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear regla"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaasLeadScoringPage() {
  const [rules, setRules]    = useState<ScoringRule[]>([]);
  const [scores, setScores]  = useState<LeadScore[]>([]);
  const [maxScore, setMax]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]        = useState<"leads" | "rules">("leads");
  const [showModal, setShowModal] = useState(false);
  const [scoringId, setScoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, scoresRes, maxRes] = await Promise.all([
        fetch("/api/saas/lead-scoring?resource=rules"),
        fetch("/api/saas/lead-scoring?resource=scores"),
        fetch("/api/saas/lead-scoring?resource=max-score"),
      ]);
      if (rulesRes.ok)  { const d = await rulesRes.json()  as { rules?: ScoringRule[] }; setRules(Array.isArray(d.rules) ? d.rules : []); }
      if (scoresRes.ok) { const d = await scoresRes.json() as { scores?: LeadScore[] };  setScores(Array.isArray(d.scores) ? d.scores : []); }
      if (maxRes.ok)    { const d = await maxRes.json()    as { max?: number };          setMax(num(d.max)); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleRule(rule: ScoringRule) {
    await fetch("/api/saas/lead-scoring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-rule", id: rule.id, active: !rule.active }) });
    void load();
  }

  async function deleteRule(id: string) {
    await fetch("/api/saas/lead-scoring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-rule", id }) });
    void load();
  }

  async function scoreContact(contactId: string) {
    setScoringId(contactId);
    await fetch("/api/saas/lead-scoring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "score-contact", contactId }) });
    setScoringId(null);
    void load();
  }

  // Solo se cuentan grados del catálogo: un valor desconocido ya no crea claves.
  const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  scores.forEach(s => {
    const g = txt(s.grade);
    if (g in gradeCount) gradeCount[g] = (gradeCount[g] ?? 0) + 1;
  });
  const activeRules = rules.filter(r => r.active).length;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Lead Scoring" parentTitle="Captación" pageTitle="Scoring" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-4 col-sm-12">
            <W3crmKpiTile icon="🎯" label={`Score máximo · ${activeRules} reglas activas`}
              value={maxScore.toLocaleString("es-ES")} accent />
          </div>
          {GRADES.map(g => (
            <div className="col-xl-2 col-sm-3" key={g}>
              <W3crmKpiTile label={`Grado ${g}`}
                value={<span className={GRADE_TEXTO[g]}>{gradeCount[g] ?? 0}</span>} />
            </div>
          ))}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Puntúa leads automáticamente con reglas configurables por campo y comportamiento
            </p>

            <ul className="nav nav-tabs mb-3" aria-label="Secciones de lead scoring">
              {(["leads", "rules"] as const).map(t => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${tab === t ? "active" : ""}`}
                    aria-pressed={tab === t} onClick={() => setTab(t)}>
                    {t === "leads" ? `Leads puntuados (${scores.length})` : `Reglas (${activeRules}/${rules.length})`}
                  </button>
                </li>
              ))}
            </ul>

            {loading ? (
              <W3crmCargando texto="Cargando scoring…" />
            ) : tab === "leads" ? (
              <W3crmContentBox titulo={`Leads puntuados (${scores.length})`} icono="fa-solid fa-ranking-star">
                {scores.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin scores aún"
                    description={'Los contacts se puntúan automáticamente al crearse o al pulsar "Puntuar" en el detalle del CRM.'}
                  />
                ) : (
                  <ul className="list-group list-group-flush">
                    {scores.map(lead => {
                      const puntos = opt(lead.score);
                      const razones = Array.isArray(lead.reasons) ? lead.reasons : [];
                      const pct = maxScore > 0 && puntos !== null
                        ? Math.min(100, Math.max(0, (puntos / maxScore) * 100))
                        : 0;
                      return (
                        <li key={lead.id} className="list-group-item px-0">
                          <div className="d-flex flex-wrap align-items-start gap-3">
                            <span className={`badge ${GRADE_BADGE[txt(lead.grade)] ?? "badge-secondary"} fs-16`}
                              style={{ width: 40, height: 40, lineHeight: "28px" }}>
                              {txt(lead.grade) || "?"}
                            </span>
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <span className="fw-bold me-2">{txt(lead.contactName) || "Sin nombre"}</span>
                              {lead.contactCompany && (
                                <span className="text-muted fs-12 me-2">· {txt(lead.contactCompany)}</span>
                              )}
                              <span className={`badge ${CAT_BADGE[txt(lead.category)] ?? "badge-secondary"}`}>
                                {etiqueta(CAT_TEXTO, lead.category)}
                              </span>
                              <span className="d-block text-muted fs-12">{txt(lead.contactEmail)}</span>
                              {razones.length > 0 && (
                                <span className="d-block mt-1">
                                  {razones.slice(0, 4).map(r => (
                                    <span key={txt(r)} className="badge badge-primary light me-1 mb-1">{txt(r)}</span>
                                  ))}
                                </span>
                              )}
                            </div>
                            <div className="text-end" style={{ minWidth: 110 }}>
                              <span className="d-block fs-18 fw-bold">{puntos === null ? "—" : puntos}</span>
                              <span className="d-block text-muted fs-12">/ {maxScore} pts</span>
                              {maxScore > 0 && (
                                <div className="progress mt-1" style={{ height: 6 }}>
                                  <div className="progress-bar bg-primary" role="progressbar"
                                    style={{ width: `${pct}%` }}
                                    aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
                                    aria-label={`Puntuación de ${txt(lead.contactName)}`} />
                                </div>
                              )}
                              <button type="button" className="btn btn-primary light btn-sm mt-1"
                                disabled={scoringId === lead.contactId}
                                onClick={() => void scoreContact(lead.contactId)}>
                                {scoringId === lead.contactId ? "Puntuando…" : "Repuntuar"}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </W3crmContentBox>
            ) : (
              <W3crmContentBox
                titulo={`Reglas (${activeRules}/${rules.length})`}
                icono="fa-solid fa-scale-balanced"
                acciones={
                  <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowModal(true)}>
                    + Nueva regla
                  </button>
                }
              >
                {rules.length === 0 ? (
                  <>
                    <W3crmEmptyState
                      title="Sin reglas configuradas"
                      description="Las reglas determinan qué acciones o datos del contacto suman o restan puntos."
                    />
                    <div className="text-center">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                        + Crear primera regla
                      </button>
                    </div>
                  </>
                ) : (
                  <W3crmDataTable
                    filas={rules}
                    etiqueta="reglas"
                    wrapperId="ls_reglas_wrapper"
                    porPagina={10}
                    columnas={[
                      { titulo: "Regla" }, { titulo: "Condición" }, { titulo: "Categoría" },
                      { titulo: "Puntos", alFinal: true }, { titulo: "Activa" }, { titulo: "Gestión", alFinal: true },
                    ]}
                    render={(r) => {
                      const puntos = opt(r.points);
                      return (
                        <tr key={r.id}>
                          <td className="fw-bold">{txt(r.name) || "—"}</td>
                          <td className="text-muted fs-12 font-mono">
                            {etiqueta(FIELD_LABELS, r.field)} {etiqueta(OP_LABELS, r.operator)}
                            {r.value ? ` ${txt(r.value)}` : ""}
                          </td>
                          <td>
                            <span className="badge badge-secondary">{etiqueta(CAT_LABEL, r.category)}</span>
                          </td>
                          <td className="text-end">
                            {puntos === null ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <span className={`fw-bold ${puntos > 0 ? "text-success" : "text-danger"}`}>
                                {puntos > 0 ? "+" : ""}{puntos}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="form-check form-switch mb-0">
                              <input className="form-check-input" type="checkbox" checked={!!r.active}
                                aria-label={`Activar regla ${r.name}`}
                                onChange={() => void toggleRule(r)} />
                            </div>
                          </td>
                          <td className="text-end">
                            <button type="button" className="btn btn-danger light btn-sm"
                              aria-label={`Eliminar regla ${r.name}`}
                              onClick={() => void deleteRule(r.id)}>Eliminar</button>
                          </td>
                        </tr>
                      );
                    }}
                  />
                )}
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>

      {showModal && <RuleModal onClose={() => setShowModal(false)} onSaved={() => void load()} />}
    </SaasW3crmShell>
  );
}
