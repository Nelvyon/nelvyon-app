"use client";

import { useState } from "react";
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

const MOCK: Survey[] = [
  {
    id: "s1", name: "NPS Post-Onboarding", description: "Satisfacción tras el primer mes de uso", status: "active", responses: 47, avgScore: 8.2, npsScore: 62, createdAt: "2026-05-01T10:00:00Z",
    questions: [
      { id: "q1", type: "nps", text: "¿Con qué probabilidad recomendarías Nelvyon a un colega? (0-10)", required: true, scale: 10 },
      { id: "q2", type: "text", text: "¿Qué es lo que más valoras hasta ahora?", required: false },
      { id: "q3", type: "text", text: "¿Qué mejorarías?", required: false },
    ],
  },
  {
    id: "s2", name: "Satisfacción Post-Servicio", description: "Feedback tras entrega de proyecto", status: "active", responses: 23, avgScore: 9.1, npsScore: null, createdAt: "2026-06-01T10:00:00Z",
    questions: [
      { id: "q4", type: "rating", text: "¿Cómo valorarías la calidad del trabajo entregado?", required: true, scale: 10 },
      { id: "q5", type: "rating", text: "¿Y la comunicación con el equipo?", required: true, scale: 10 },
      { id: "q6", type: "choice", text: "¿Volverías a contratarnos?", required: true, options: ["Sí, seguro", "Probablemente sí", "No lo sé", "Probablemente no"] },
      { id: "q7", type: "text", text: "Comentario libre", required: false },
    ],
  },
  {
    id: "s3", name: "Encuesta de Producto", description: "Qué funcionalidades priorizar en el roadmap", status: "draft", responses: 0, avgScore: null, npsScore: null, createdAt: "2026-06-20T10:00:00Z",
    questions: [
      { id: "q8", type: "choice", text: "¿Qué módulo usas más?", required: true, options: ["CRM", "Campañas", "Workflows", "Reportes"] },
      { id: "q9", type: "choice", text: "¿Qué echarías más en falta?", required: false, options: ["App móvil", "Integración Shopify", "Editor email visual", "API pública"] },
      { id: "q10", type: "boolean", text: "¿Recomendarías añadir IA a los reportes?", required: false },
    ],
  },
];

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
  const [surveys] = useState<Survey[]>(MOCK);

  const stats = {
    active: surveys.filter(s => s.status === "active").length,
    responses: surveys.reduce((s, sv) => s + sv.responses, 0),
    avgNps: Math.round(surveys.filter(s => s.npsScore !== null).reduce((s, sv) => s + (sv.npsScore ?? 0), 0) / surveys.filter(s => s.npsScore !== null).length),
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

            <div className="space-y-4">
              {surveys.map(s => <SurveyCard key={s.id} survey={s} />)}
            </div>
    </SaasShellLayout>
  );
}
