"use client";

import { Download, FileBarChart, Mail, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import {
  executiveReportsApi,
  type ExecutiveMetrics,
  type ExecutiveReportRecord,
  type ReportPeriod,
  type ReportSchedule,
} from "@/features/executive-reports/api";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function MetricCard({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {delta && <p className="text-xs text-muted-foreground">{delta}</p>}
    </div>
  );
}

export default function ExecutiveReportsPage() {
  const [reports, setReports] = useState<ExecutiveReportRecord[]>([]);
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [schedule, setSchedule] = useState<ReportSchedule | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hist, preview, sched] = await Promise.all([
        executiveReportsApi.history(),
        executiveReportsApi.preview(period),
        executiveReportsApi.getSchedule(),
      ]);
      setReports(hist.items ?? []);
      setMetrics(preview.metrics ?? null);
      setSchedule(sched);
      setEmailInput((sched.recipient_emails ?? []).join(", "));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function generateNow() {
    setGenerating(true);
    try {
      await executiveReportsApi.generate(period);
      await load();
    } finally {
      setGenerating(false);
    }
  }

  async function saveSchedule() {
    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const updated = await executiveReportsApi.updateSchedule({
      ...schedule,
      recipient_emails: emails,
    });
    setSchedule(updated);
  }

  async function sendNow() {
    await executiveReportsApi.sendNow(period);
    await load();
  }

  function downloadReport(id: string) {
    window.open(executiveReportsApi.downloadUrl(id), "_blank");
  }

  const email = metrics?.email?.current ?? {};
  const crm = metrics?.crm?.current ?? {};
  const web = metrics?.web?.current ?? {};

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FileBarChart className="h-6 w-6" />
              Reportes Ejecutivos
            </h1>
            <p className="text-sm text-muted-foreground">
              Informes automáticos semanales y mensuales con PDF y recomendaciones IA.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
            <Button disabled={generating} onClick={generateNow}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generar reporte ahora
            </Button>
          </div>
        </header>

        {metrics && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Open rate email"
              value={`${email.open_rate ?? 0}%`}
              delta={
                metrics.email?.comparison?.open_rate != null
                  ? `${metrics.email.comparison.open_rate}% vs ant.`
                  : undefined
              }
            />
            <MetricCard label="Nuevos contactos" value={crm.new_contacts ?? 0} />
            <MetricCard label="Revenue €" value={crm.revenue ?? 0} />
            <MetricCard label="Visitas web" value={web.visits ?? 0} />
          </section>
        )}

        {metrics?.recommendations && metrics.recommendations.length > 0 && (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 font-semibold">Recomendaciones IA</h2>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {metrics.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Envío automático</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Día semanal
              <select
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                value={schedule?.send_day_of_week ?? 0}
                onChange={(e) =>
                  setSchedule((s) => (s ? { ...s, send_day_of_week: Number(e.target.value) } : s))
                }
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Hora (workspace TZ)
              <input
                type="number"
                min={0}
                max={23}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                value={schedule?.send_hour ?? 9}
                onChange={(e) =>
                  setSchedule((s) => (s ? { ...s, send_hour: Number(e.target.value) } : s))
                }
              />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            Emails destinatarios (separados por coma)
            <input
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="admin@empresa.com, ceo@empresa.com"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveSchedule}>
              Guardar configuración
            </Button>
            <Button variant="outline" onClick={sendNow}>
              <Mail className="mr-2 h-4 w-4" />
              Enviar ahora por email
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Historial</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay reportes generados.</p>
          ) : (
            <ul className="divide-y">
              {reports.map((r) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={r.id}>
                  <div>
                    <p className="font-medium capitalize">{r.period}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.generated_at ? new Date(r.generated_at).toLocaleString("es-ES") : "—"}
                      {r.sent_at ? " · Enviado" : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadReport(r.id)}>
                    <Download className="mr-1 h-3 w-3" />
                    PDF
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ProtectedLayout>
  );
}
