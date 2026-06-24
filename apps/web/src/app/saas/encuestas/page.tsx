"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type QuestionType = "rating" | "nps" | "text" | "choice" | "boolean";
type SurveyStatus = "draft" | "active" | "closed";

interface SurveyQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[];
  scale?: number;
}

interface Survey {
  id: string;
  name: string;
  description: string;
  status: SurveyStatus;
  questions: SurveyQuestion[];
  responses: number;
  avgScore: number | null;
  npsScore: number | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<SurveyStatus, { label: string; tone: "primary" | "success" | "warning" }> = {
  draft: { label: "Borrador", tone: "primary" },
  active: { label: "Activa", tone: "success" },
  closed: { label: "Cerrada", tone: "warning" },
};

const Q_ICON: Record<QuestionType, string> = {
  rating: "⭐", nps: "📊", text: "T", choice: "☑", boolean: "Y/N",
};

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

function SurveyCard({ survey }: { survey: Survey }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[survey.status];

  return (
    <NelvyonDsCard className="overflow-hidden p-0">
      <div className="p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{survey.name}</h3>
              <NelvyonDsBadge tone={sc.tone}>{sc.label}</NelvyonDsBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{survey.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{survey.questions.length} preguntas · {survey.responses} respuestas</p>
          </div>
          <div className="flex items-center gap-6">
            {survey.npsScore !== null && <NpsGauge score={survey.npsScore} />}
            {survey.avgScore !== null && (
              <div className="flex flex-col items-center">
                <p className="text-4xl font-bold text-primary">{survey.avgScore}</p>
                <p className="text-xs text-muted-foreground">Puntuación media</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary hover:underline">
            {expanded ? "▲ Ocultar preguntas" : "▼ Ver preguntas"}
          </button>
          {survey.status === "active" && <NelvyonDsButton variant="ghost" className="text-xs">↗ Compartir enlace</NelvyonDsButton>}
          <NelvyonDsButton variant="ghost" className="text-xs">Ver respuestas</NelvyonDsButton>
          {survey.status === "draft" && <NelvyonDsButton className="text-xs">Activar</NelvyonDsButton>}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border p-5 space-y-3">
          {survey.questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 rounded-lg bg-muted/10 p-3">
              <span className="shrink-0 rounded-md bg-muted/30 px-2 py-0.5 text-xs font-mono text-muted-foreground">{Q_ICON[q.type]}</span>
              <div className="flex-1">
                <p className="text-sm text-foreground">{i + 1}. {q.text}</p>
                {q.options && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {q.options.map(o => <span key={o} className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{o}</span>)}
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

export default function SaasEncuestasPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const withNps = surveys.filter(s => s.npsScore !== null);
  const stats = {
    active: surveys.filter(s => s.status === "active").length,
    responses: surveys.reduce((s, sv) => s + sv.responses, 0),
    avgNps: withNps.length > 0
      ? Math.round(withNps.reduce((s, sv) => s + (sv.npsScore ?? 0), 0) / withNps.length)
      : 0,
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="encuestas" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Encuestas & Feedback" subtitle="NPS, satisfacción de clientes y encuestas de producto" />
              <NelvyonDsButton>+ Nueva encuesta</NelvyonDsButton>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Encuestas activas", value: stats.active },
                { label: "Respuestas totales", value: stats.responses },
                { label: "NPS promedio", value: stats.avgNps },
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
                <NelvyonDsButton className="mt-5">+ Nueva encuesta</NelvyonDsButton>
              </NelvyonDsCard>
            ) : (
              <div className="space-y-4">
                {surveys.map(s => <SurveyCard key={s.id} survey={s} />)}
              </div>
            )}
    </SaasShellLayout>
  );
}
