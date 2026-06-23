"use client";

import { useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type ABStatus = "running" | "winner" | "paused" | "draft";
type ABType = "email_subject" | "email_content" | "landing" | "cta";

interface ABVariant {
  id: string;
  name: string;
  label: string;
  sent: number;
  opens: number;
  clicks: number;
  conversions: number;
  winner: boolean;
}

interface ABTest {
  id: string;
  name: string;
  type: ABType;
  status: ABStatus;
  variants: ABVariant[];
  splitPercent: number;
  startedAt: string | null;
  endedAt: string | null;
  winnerMetric: "open_rate" | "click_rate" | "conversion_rate";
  confidence: number | null;
}

const STATUS_CONFIG: Record<ABStatus, { label: string; tone: "primary" | "success" | "warning" | "danger"; icon: string }> = {
  running: { label: "En ejecución", tone: "success", icon: "▶" },
  winner: { label: "Ganador declarado", tone: "primary", icon: "🏆" },
  paused: { label: "Pausado", tone: "warning", icon: "‖" },
  draft: { label: "Borrador", tone: "primary", icon: "✎" },
};

const TYPE_LABEL: Record<ABType, string> = {
  email_subject: "Asunto de email", email_content: "Contenido email", landing: "Landing page", cta: "Botón CTA",
};

const MOCK: ABTest[] = [
  {
    id: "t1", name: "Asunto campaña reactivación", type: "email_subject", status: "winner",
    winnerMetric: "open_rate", confidence: 97, splitPercent: 50, startedAt: "2026-06-10T10:00:00Z", endedAt: "2026-06-13T10:00:00Z",
    variants: [
      { id: "v1", name: "A", label: "¡Te echamos de menos! Vuelve con 20% dto.", sent: 500, opens: 210, clicks: 42, conversions: 18, winner: false },
      { id: "v2", name: "B", label: "Tu descuento exclusivo caduca mañana ⏰", sent: 500, opens: 285, clicks: 68, conversions: 31, winner: true },
    ],
  },
  {
    id: "t2", name: "CTA landing servicios", type: "cta", status: "running",
    winnerMetric: "conversion_rate", confidence: 61, splitPercent: 50, startedAt: "2026-06-20T10:00:00Z", endedAt: null,
    variants: [
      { id: "v3", name: "A", label: "Solicitar información", sent: 1240, opens: 1240, clicks: 87, conversions: 23, winner: false },
      { id: "v4", name: "B", label: "Ver demostración gratis", sent: 1240, opens: 1240, clicks: 134, conversions: 41, winner: false },
    ],
  },
  {
    id: "t3", name: "Contenido email bienvenida", type: "email_content", status: "draft",
    winnerMetric: "click_rate", confidence: null, splitPercent: 50, startedAt: null, endedAt: null,
    variants: [
      { id: "v5", name: "A", label: "Versión larga con vídeo tutorial", sent: 0, opens: 0, clicks: 0, conversions: 0, winner: false },
      { id: "v6", name: "B", label: "Versión corta con 3 pasos clave", sent: 0, opens: 0, clicks: 0, conversions: 0, winner: false },
    ],
  },
];

function pct(n: number, d: number) { return d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—"; }

function VariantBar({ variant, metric, total, isWinner }: { variant: ABVariant; metric: "open_rate" | "click_rate" | "conversion_rate"; total: number; isWinner: boolean }) {
  const value = metric === "open_rate" ? variant.opens / variant.sent : metric === "click_rate" ? variant.clicks / variant.opens || 0 : variant.conversions / variant.sent;
  const display = metric === "open_rate" ? pct(variant.opens, variant.sent) : metric === "click_rate" ? pct(variant.clicks, variant.opens) : pct(variant.conversions, variant.sent);
  const pctWidth = Math.min(100, value * 100 * 2);

  return (
    <div className={`rounded-xl border p-4 transition-all ${isWinner ? "border-primary bg-primary/10" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${isWinner ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>
              {variant.name}
            </span>
            {isWinner && <span className="text-xs text-primary font-medium">🏆 Ganador</span>}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-72 italic">"{variant.label}"</p>
        </div>
        <p className={`text-2xl font-bold ${isWinner ? "text-primary" : "text-foreground"}`}>{display}</p>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isWinner ? "bg-primary" : "bg-muted-foreground/40"}`} style={{ width: `${pctWidth}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>{variant.sent.toLocaleString()} enviados</span>
        <span>{variant.opens.toLocaleString()} aperturas</span>
        <span>{variant.clicks} clics</span>
        <span>{variant.conversions} conv.</span>
      </div>
    </div>
  );
}

export default function SaasABTestingPage() {
  const [tests] = useState<ABTest[]>(MOCK);
  const [filterStatus, setFilterStatus] = useState<ABStatus | "all">("all");

  const filtered = tests.filter(t => filterStatus === "all" || t.status === filterStatus);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="ab-testing" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="A/B Testing" subtitle="Prueba variantes de emails, landings y CTAs para optimizar conversiones" />
              <NelvyonDsButton>+ Nuevo test</NelvyonDsButton>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Tests activos", value: tests.filter(t => t.status === "running").length },
                { label: "Tests completados", value: tests.filter(t => t.status === "winner").length },
                { label: "Total variantes", value: tests.reduce((s, t) => s + t.variants.length, 0) },
                { label: "Mejora media", value: "+23%" },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {(["all", "running", "winner", "paused", "draft"] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s as ABStatus | "all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "Todos" : STATUS_CONFIG[s as ABStatus].label}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              {filtered.map(test => {
                const sc = STATUS_CONFIG[test.status];
                return (
                  <NelvyonDsCard key={test.id} className="overflow-hidden p-0">
                    <div className="flex flex-wrap items-start gap-3 p-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{test.name}</h3>
                          <NelvyonDsBadge tone={sc.tone}>{sc.icon} {sc.label}</NelvyonDsBadge>
                          <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">{TYPE_LABEL[test.type]}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Métrica: <strong className="text-foreground">{test.winnerMetric === "open_rate" ? "Tasa apertura" : test.winnerMetric === "click_rate" ? "Tasa clic" : "Tasa conversión"}</strong>
                          {test.confidence !== null && <> · Confianza estadística: <strong className={test.confidence >= 95 ? "text-green-400" : "text-yellow-400"}>{test.confidence}%</strong></>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {test.status === "draft" && <NelvyonDsButton className="text-xs">▶ Iniciar</NelvyonDsButton>}
                        {test.status === "running" && <NelvyonDsButton variant="ghost" className="text-xs">‖ Pausar</NelvyonDsButton>}
                        <NelvyonDsButton variant="ghost" className="text-xs">✎ Editar</NelvyonDsButton>
                      </div>
                    </div>
                    <div className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
                      {test.variants.map(v => (
                        <VariantBar key={v.id} variant={v} metric={test.winnerMetric} total={v.sent} isWinner={v.winner} />
                      ))}
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </div>
    </SaasShellLayout>
  );
}
