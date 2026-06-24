"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

const GRADE_COLOR: Record<LeadGrade, string> = {
  A: "text-green-400 bg-green-500/10 border-green-500/20",
  B: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  C: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  D: "text-red-400 bg-red-500/10 border-red-500/20",
};
const CAT_LABEL: Record<RuleCategory, string> = {
  demographic: "Demográfico", behavioral: "Comportamiento",
  engagement: "Engagement", firmographic: "Firmográfico",
};
const CAT_BADGE: Record<LeadCategory, "success" | "warning" | "danger"> = {
  hot: "success", warm: "warning", cold: "danger",
};
const FIELD_LABELS: Record<RuleField, string> = {
  "contact.has_email": "Tiene email", "contact.has_phone": "Tiene teléfono",
  "contact.has_company": "Tiene empresa", "contact.has_notes": "Tiene notas",
  "contact.status": "Estado", "contact.pipeline_stage": "Etapa pipeline",
  "contact.email_opens": "Emails abiertos", "contact.email_clicks": "Clics en email",
  "contact.activity_count": "Actividades totales", "contact.value": "Valor contacto",
};
const OP_LABELS: Record<RuleOperator, string> = {
  equals: "=", not_equals: "≠", greater_than: ">", less_than: "<",
  contains: "contiene", not_contains: "no contiene", is_true: "es verdadero", is_false: "es falso",
};

const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

// ── Rule Create Modal ─────────────────────────────────────────────────────────
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
      const d = await res.json() as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear regla"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Nueva regla de scoring</h2>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Abrió email" className={inp} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Campo</label>
              <select value={field} onChange={e => { setField(e.target.value as RuleField); setOperator(e.target.value.startsWith("contact.has_") ? "is_true" : "equals"); }} className={inp}>
                {(Object.entries(FIELD_LABELS) as [RuleField, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value as RuleCategory)} className={inp}>
                {(Object.entries(CAT_LABEL) as [RuleCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Operador</label>
              <select value={operator} onChange={e => setOperator(e.target.value as RuleOperator)} className={inp}>
                {booleanField
                  ? [<option key="is_true" value="is_true">es verdadero</option>, <option key="is_false" value="is_false">es falso</option>]
                  : numericField
                    ? [<option key="gt" value="greater_than">&gt;</option>, <option key="lt" value="less_than">&lt;</option>, <option key="eq" value="equals">=</option>]
                    : [<option key="eq" value="equals">=</option>, <option key="neq" value="not_equals">≠</option>, <option key="con" value="contains">contiene</option>]
                }
              </select>
            </div>
            {!booleanField && (
              <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Valor</label>
                <input value={value} onChange={e => setValue(e.target.value)} placeholder={numericField ? "5" : "qualified"} className={inp} /></div>
            )}
          </div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Puntos (negativo = penalización)</label>
            <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className={inp} /></div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Crear regla"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
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
      if (rulesRes.ok)  { const d = await rulesRes.json()  as { rules?: ScoringRule[] }; setRules(d.rules ?? []); }
      if (scoresRes.ok) { const d = await scoresRes.json() as { scores?: LeadScore[] };  setScores(d.scores ?? []); }
      if (maxRes.ok)    { const d = await maxRes.json()    as { max?: number };           setMax(d.max ?? 0); }
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

  const gradeCount: Record<LeadGrade, number> = { A: 0, B: 0, C: 0, D: 0 };
  scores.forEach(s => gradeCount[s.grade]++);
  const activeRules = rules.filter(r => r.active).length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="lead-scoring" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="Lead Scoring" subtitle="Puntúa leads automáticamente con reglas configurables por campo y comportamiento" />
          <div className="flex gap-2">
            {tab === "rules" && <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nueva regla</NelvyonDsButton>}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <NelvyonDsCard className="p-4">
            <p className="text-xs text-muted-foreground">Score máximo</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{maxScore}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activeRules} reglas activas</p>
          </NelvyonDsCard>
          {(["A","B","C","D"] as LeadGrade[]).map(g => (
            <NelvyonDsCard key={g} className={`p-4 border ${GRADE_COLOR[g].split(" ").slice(1).join(" ")}`}>
              <p className="text-xs text-muted-foreground">Grado {g}</p>
              <p className={`mt-1 text-2xl font-bold ${GRADE_COLOR[g].split(" ")[0]}`}>{gradeCount[g]}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["leads","rules"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "leads" ? `📊 Leads puntuados (${scores.length})` : `⚙️ Reglas (${activeRules}/${rules.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : tab === "leads" ? (
          scores.length === 0 ? (
            <NelvyonDsCard className="p-14 text-center">
              <p className="text-3xl">🎯</p>
              <p className="mt-3 text-lg font-semibold text-foreground">Sin scores aún</p>
              <p className="mt-1 text-sm text-muted-foreground">Los contacts se puntúan automáticamente al crearse o al pulsar "Puntuar" en el detalle del CRM.</p>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-3">
              {scores.map(lead => (
                <NelvyonDsCard key={lead.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold ${GRADE_COLOR[lead.grade]}`}>
                      {lead.grade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{lead.contactName || "Sin nombre"}</p>
                        {lead.contactCompany && <span className="text-xs text-muted-foreground">· {lead.contactCompany}</span>}
                        <NelvyonDsBadge tone={CAT_BADGE[lead.category]}>{lead.category === "hot" ? "🔥 Hot" : lead.category === "warm" ? "🌡 Warm" : "❄ Cold"}</NelvyonDsBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">{lead.contactEmail}</p>
                      {lead.reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lead.reasons.slice(0, 4).map(r => <span key={r} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{r}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-foreground">{lead.score}</p>
                      <p className="text-xs text-muted-foreground">/ {maxScore} pts</p>
                      {maxScore > 0 && (
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (lead.score / maxScore) * 100)}%` }} />
                        </div>
                      )}
                      <button onClick={() => void scoreContact(lead.contactId)} disabled={scoringId === lead.contactId}
                        className="mt-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                        {scoringId === lead.contactId ? "Puntuando…" : "↻ Repuntuar"}
                      </button>
                    </div>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )
        ) : (
          rules.length === 0 ? (
            <NelvyonDsCard className="p-14 text-center">
              <p className="text-3xl">⚙️</p>
              <p className="mt-3 text-lg font-semibold text-foreground">Sin reglas configuradas</p>
              <p className="mt-1 text-sm text-muted-foreground">Las reglas determinan qué acciones o datos del contacto suman o restan puntos.</p>
              <NelvyonDsButton className="mt-5" onClick={() => setShowModal(true)}>+ Crear primera regla</NelvyonDsButton>
            </NelvyonDsCard>
          ) : (
            <NelvyonDsCard className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Regla</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Condición</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Categoría</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Puntos</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Activa</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {FIELD_LABELS[r.field]} {OP_LABELS[r.operator]}{r.value ? ` ${r.value}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">{CAT_LABEL[r.category]}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${r.points > 0 ? "text-green-400" : "text-red-400"}`}>
                          {r.points > 0 ? "+" : ""}{r.points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => void toggleRule(r)}
                          className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors ${r.active ? "bg-primary" : "bg-muted"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${r.active ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => void deleteRule(r.id)} className="text-xs text-muted-foreground hover:text-red-400">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </NelvyonDsCard>
          )
        )}
      </div>
      {showModal && <RuleModal onClose={() => setShowModal(false)} onSaved={() => void load()} />}
    </SaasShellLayout>
  );
}
