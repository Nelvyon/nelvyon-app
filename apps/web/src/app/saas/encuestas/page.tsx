"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type QuestionType = "rating" | "nps" | "text" | "multiple_choice" | "checkbox";
type SurveyStatus = "draft" | "active" | "closed";
type SurveyType = "survey" | "nps" | "feedback" | "quiz";

interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  scale?: number;
}

interface Survey {
  id: string;
  name: string;
  type: SurveyType;
  active: boolean;
  questions: SurveyQuestion[];
  responsesCount: number;
  npsScore: number | null;
  createdAt: string;
}

const STATUS: Record<string, { label: string; tone: "primary" | "success" | "warning" }> = {
  true:  { label: "Activa", tone: "success" },
  false: { label: "Borrador", tone: "primary" },
};

const Q_ICON: Record<QuestionType, string> = {
  rating: "⭐", nps: "📊", text: "T", multiple_choice: "☑", checkbox: "☑",
};

// ─── NPS gauge ───────────────────────────────────────────────────────────────

function NpsGauge({ score }: { score: number }) {
  const color = score >= 50 ? "text-green-400" : score >= 0 ? "text-yellow-400" : "text-red-400";
  const label = score >= 50 ? "Excelente" : score >= 0 ? "Neutro" : "Mejorar";
  return (
    <div className="flex flex-col items-center">
      <p className={`text-4xl font-bold ${color}`}>{score}</p>
      <p className="text-xs text-muted-foreground">NPS · {label}</p>
    </div>
  );
}

// ─── Share link modal ─────────────────────────────────────────────────────────

function ShareModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const [enabling, setEnabling] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com";

  async function enable() {
    setEnabling(true);
    try {
      const r = await fetch("/api/saas/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable_share", id: survey.id }),
      });
      if (r.ok) {
        const d = (await r.json()) as { slug: string };
        setLink(`${origin}/s/${d.slug}`);
      }
    } finally {
      setEnabling(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Compartir encuesta</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Genera un enlace público para que tus clientes completen la encuesta
        </p>
        {!link ? (
          <NelvyonDsButton onClick={() => void enable()} disabled={enabling}>
            {enabling ? "Generando…" : "Generar enlace público"}
          </NelvyonDsButton>
        ) : (
          <>
            <pre className="overflow-x-auto rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground mb-4 whitespace-pre-wrap break-all">
              {link}
            </pre>
            <div className="flex gap-3">
              <NelvyonDsButton className="flex-1" onClick={() => void copy()}>
                {copied ? "¡Copiado!" : "Copiar enlace"}
              </NelvyonDsButton>
              <NelvyonDsButton variant="ghost" onClick={onClose}>Cerrar</NelvyonDsButton>
            </div>
          </>
        )}
        {!link && (
          <div className="mt-3">
            <NelvyonDsButton variant="ghost" onClick={onClose}>Cancelar</NelvyonDsButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Responses panel ──────────────────────────────────────────────────────────

interface SurveyResponse {
  id: string;
  answers: Record<string, unknown>;
  score: number | null;
  completedAt: string;
}

function ResponsesPanel({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/saas/surveys?id=${survey.id}&responses=true`);
      if (r.ok) {
        const d = (await r.json()) as { responses: SurveyResponse[] };
        setResponses(d.responses ?? []);
      }
      setLoading(false);
    })();
  }, [survey.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Respuestas — {survey.name}</h2>
          <NelvyonDsButton variant="ghost" onClick={onClose}>Cerrar</NelvyonDsButton>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : responses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Sin respuestas todavía</p>
        ) : (
          <div className="space-y-3">
            {responses.map((r) => (
              <NelvyonDsCard key={r.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{new Date(r.completedAt).toLocaleString("es-ES")}</p>
                  {r.score != null && <NelvyonDsBadge tone="primary">Score: {r.score}</NelvyonDsBadge>}
                </div>
                {Object.entries(r.answers).map(([qId, ans]) => {
                  const q = survey.questions.find(q => q.id === qId);
                  return (
                    <div key={qId} className="text-sm">
                      <span className="text-muted-foreground">{q?.label ?? qId}: </span>
                      <span className="text-foreground">{Array.isArray(ans) ? ans.join(", ") : String(ans)}</span>
                    </div>
                  );
                })}
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create survey modal ──────────────────────────────────────────────────────

const QUESTION_TEMPLATES: Record<SurveyType, SurveyQuestion[]> = {
  nps: [{ id: "q1", type: "nps", label: "¿Con qué probabilidad nos recomendarías a un amigo o colega?", required: true }],
  feedback: [
    { id: "q1", type: "rating", label: "¿Cómo valorarías tu experiencia?", required: true, scale: 5 },
    { id: "q2", type: "text", label: "¿Qué podríamos mejorar?", required: false },
  ],
  survey: [{ id: "q1", type: "text", label: "¿Cuál es tu opinión sobre nuestro servicio?", required: true }],
  quiz: [
    { id: "q1", type: "multiple_choice", label: "Pregunta de ejemplo", required: true, options: ["Opción A", "Opción B", "Opción C"] },
  ],
};

function CreateSurveyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SurveyType>("nps");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/saas/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, questions: QUESTION_TEMPLATES[type] }),
      });
      if (r.ok) { onSaved(); onClose(); }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nueva encuesta</h2>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre</label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Encuesta NPS — Junio 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    type === value ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-sm text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose}>Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name.trim()}>
              {saving ? "Creando…" : "Crear encuesta"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Survey card ──────────────────────────────────────────────────────────────

function SurveyCard({
  survey,
  onActivate,
  onShare,
  onResponses,
}: {
  survey: Survey;
  onActivate: () => void;
  onShare: () => void;
  onResponses: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS[String(survey.active)] ?? STATUS["false"];

  return (
    <NelvyonDsCard className="overflow-hidden p-0">
      <div className="p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{survey.name}</h3>
              <NelvyonDsBadge tone={sc.tone}>{sc.label}</NelvyonDsBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {survey.questions.length} preguntas · {survey.responsesCount} respuestas
            </p>
          </div>
          {survey.npsScore != null && <NpsGauge score={survey.npsScore} />}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary hover:underline">
            {expanded ? "▲ Ocultar" : "▼ Ver preguntas"}
          </button>
          {survey.active && (
            <NelvyonDsButton variant="ghost" className="text-xs" onClick={onShare}>
              ↗ Compartir enlace
            </NelvyonDsButton>
          )}
          <NelvyonDsButton variant="ghost" className="text-xs" onClick={onResponses}>
            Ver respuestas
          </NelvyonDsButton>
          {!survey.active && (
            <NelvyonDsButton className="text-xs" onClick={onActivate}>Activar</NelvyonDsButton>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border p-5 space-y-3">
          {survey.questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 rounded-lg bg-muted/10 p-3">
              <span className="shrink-0 rounded-md bg-muted/30 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {Q_ICON[q.type] ?? q.type}
              </span>
              <div className="flex-1">
                <p className="text-sm text-foreground">{i + 1}. {q.label}</p>
                {q.options && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {q.options.map(o => (
                      <span key={o} className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{o}</span>
                    ))}
                  </div>
                )}
              </div>
              {q.required && <span className="text-xs text-red-400 shrink-0">*</span>}
            </div>
          ))}
        </div>
      )}
    </NelvyonDsCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasEncuestasPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [shareSurvey, setShareSurvey] = useState<Survey | null>(null);
  const [responsesSurvey, setResponsesSurvey] = useState<Survey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/surveys");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { surveys?: Survey[] };
      setSurveys(d.surveys ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar encuestas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleActivate(survey: Survey) {
    await fetch("/api/saas/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: survey.id, active: true }),
    });
    await load();
  }

  const withNps = surveys.filter(s => s.npsScore !== null);
  const stats = {
    active: surveys.filter(s => s.active).length,
    responses: surveys.reduce((s, sv) => s + sv.responsesCount, 0),
    avgNps: withNps.length > 0
      ? Math.round(withNps.reduce((s, sv) => s + (sv.npsScore ?? 0), 0) / withNps.length)
      : 0,
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="encuestas" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="Encuestas & Feedback" subtitle="NPS, satisfacción de clientes y encuestas de producto" />
          <NelvyonDsButton onClick={() => setShowCreate(true)}>+ Nueva encuesta</NelvyonDsButton>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Encuestas activas", value: stats.active },
            { label: "Respuestas totales", value: stats.responses },
            { label: "NPS promedio", value: withNps.length > 0 ? stats.avgNps : "—" },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {error && (
          <NelvyonDsCard className="p-4 border-red-500/30 bg-red-500/5">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => void load()} className="mt-2 text-xs text-primary hover:underline">Reintentar</button>
          </NelvyonDsCard>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : surveys.length === 0 && !error ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-4xl">📋</p>
            <p className="mt-4 font-semibold text-foreground">Sin encuestas todavía</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea tu primera encuesta de NPS o satisfacción</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowCreate(true)}>+ Nueva encuesta</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-4">
            {surveys.map(s => (
              <SurveyCard
                key={s.id}
                survey={s}
                onActivate={() => void handleActivate(s)}
                onShare={() => setShareSurvey(s)}
                onResponses={() => setResponsesSurvey(s)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateSurveyModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {shareSurvey && <ShareModal survey={shareSurvey} onClose={() => setShareSurvey(null)} />}
      {responsesSurvey && <ResponsesPanel survey={responsesSurvey} onClose={() => setResponsesSurvey(null)} />}
    </SaasShellLayout>
  );
}
