"use client";

import { useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { triggerLearningExportDownload } from "@/features/osAutonomous/api";
import { useOsAutonomousLearningDashboard } from "@/features/osAutonomous/hooks";
import type { LearningAlertItem, LearningExportKey, LearningTemplateItem } from "@/features/osAutonomous/types";

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function TemplateTable({ rows, title }: { rows: LearningTemplateItem[]; title: string }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Plantilla</th>
              <th className="py-2 pr-3 font-medium">Sector</th>
              <th className="py-2 pr-3 font-medium">Servicio</th>
              <th className="py-2 pr-3 font-medium">Score</th>
              <th className="py-2 pr-3 font-medium">Conv.</th>
              <th className="py-2 pr-3 font-medium">CR</th>
              <th className="py-2 pr-3 font-medium">Leads</th>
              <th className="py-2 pr-3 font-medium">QA</th>
              <th className="py-2 pr-3 font-medium">Aprob.</th>
              <th className="py-2 pr-3 font-medium">Rev.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.template_id}-${r.sector}-${r.service}-${r.rank_position}`} className="border-b border-border/60">
                <td className="py-2 pr-3 font-medium text-foreground">
                  {r.template_id}
                  {r.cold_start ? (
                    <Badge tone="neutral" className="ml-2">
                      cold
                    </Badge>
                  ) : null}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{r.sector}</td>
                <td className="py-2 pr-3 text-muted-foreground">{r.service}</td>
                <td className="py-2 pr-3">{r.final_template_score.toFixed(1)}</td>
                <td className="py-2 pr-3">{r.conversion_score.toFixed(1)}</td>
                <td className="py-2 pr-3">{fmtPct(r.conversion_rate)}</td>
                <td className="py-2 pr-3">{fmtNum(r.lead_count)}</td>
                <td className="py-2 pr-3">{r.qa_score.toFixed(1)}</td>
                <td className="py-2 pr-3">{r.approved_by_client ? "Sí" : "No"}</td>
                <td className="py-2 pr-3">{r.revisions_count.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AlertsPanel({ alerts }: { alerts: LearningAlertItem[] }) {
  if (!alerts.length) {
    return (
      <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
        <p className="font-medium text-foreground">Alertas internas</p>
        <p className="mt-1">Sin alertas activas.</p>
      </section>
    );
  }
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">Alertas internas ({alerts.length})</h3>
      <ul className="space-y-2 text-sm">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={`rounded-md border px-3 py-2 ${
              a.severity === "crit" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={a.severity === "crit" ? "destructive" : "warning"}>{a.severity}</Badge>
              <span className="font-medium text-foreground">{a.type}</span>
              {a.template_id ? <span className="text-muted-foreground">{a.template_id}</span> : null}
            </div>
            <p className="mt-1 text-muted-foreground">{a.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExportButtons({ available }: { available: Record<string, boolean> }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const keys: LearningExportKey[] = ["rankings", "outcomes", "sector_summary"];

  async function onExport(key: LearningExportKey) {
    setLoading(key);
    setError(null);
    try {
      await triggerLearningExportDownload(key);
    } catch {
      setError("No se pudo descargar el CSV. Ejecuta autonomous:learning-refresh en staging.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">Export CSV</h3>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!available[k] || loading === k}
            onClick={() => onExport(k)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading === k ? "…" : `${k}.csv`}
          </button>
        ))}
      </div>
      {!available.rankings && !available.outcomes ? (
        <p className="text-xs text-muted-foreground">
          Sin exports — ejecuta <code className="rounded bg-muted px-1">pnpm -C apps/web autonomous:learning-refresh</code>
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}

/** Phase O/P — internal Learning Engine dashboard (operator+ only). */
export function OsAutonomousLearningView() {
  const { user } = useAuth();
  const operatorPlus = user ? can(user.role, "os", "create") : false;
  const q = useOsAutonomousLearningDashboard();
  const d = q.data;

  if (!operatorPlus) {
    return (
      <ForbiddenNotice title="Acceso restringido">
        <p>El Learning Engine es solo para owner, admin u operator. Los clientes y viewers no tienen acceso.</p>
      </ForbiddenNotice>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Learning Engine</h2>
          <Badge tone="neutral">AUTONOMOUS Phase P</Badge>
          {d?.autonomy_pct != null ? <Badge tone="success">Autonomía {d.autonomy_pct}%</Badge> : null}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Rankings internos de plantillas autónomas — conversiones, QA y feedback portal. Sin datos de clientes ni
          secretos GA4.
        </p>
      </header>

      {q.isLoading ? <p className="text-sm text-muted-foreground">Cargando rankings…</p> : null}

      {q.error && typeof q.error === "object" && "status" in q.error ? (
        <ErrorNotice>
          <p>No se pudo cargar el dashboard de learning ({String((q.error as { status: number }).status)}).</p>
        </ErrorNotice>
      ) : null}

      {d ? (
        <>
          <section className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm shadow-card sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-muted-foreground">Almacenamiento</p>
              <p className="font-medium text-foreground">{d.storage_mode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Outcomes</p>
              <p className="font-medium text-foreground">{d.outcomes_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Alertas</p>
              <p className="font-medium text-foreground">{d.alerts_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Última actualización</p>
              <p className="font-medium text-foreground">{d.computed_at ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Refresh</p>
              <p className="font-medium text-foreground">
                {d.refresh_status?.source ?? "manual"} · {d.refresh_status?.computed_at ?? "—"}
              </p>
            </div>
          </section>

          <AlertsPanel alerts={d.alerts ?? []} />
          <ExportButtons available={d.exports_available ?? {}} />

          <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">GA4 — {d.ga4.mode}</p>
            <p className="mt-1 text-muted-foreground">{d.ga4.message}</p>
          </section>

          {d.outcomes_count === 0 && !d.top_templates.length ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Sin datos de learning</p>
              <p className="mt-2">
                Ejecuta{" "}
                <code className="rounded bg-muted px-1">pnpm -C apps/web autonomous:learning-refresh</code> en staging
                para poblar rankings, alertas y exports.
              </p>
            </div>
          ) : (
            <>
              <TemplateTable rows={d.top_templates} title="Top plantillas" />

              {d.by_sector.length ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Ranking por sector</h3>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {d.by_sector.map((g) => (
                      <li key={g.sector ?? g.top_template_id} className="rounded-md border border-border bg-card p-3 text-sm">
                        <p className="font-medium text-foreground">{g.sector}</p>
                        <p className="text-muted-foreground">
                          Top: {g.top_template_id} ({g.top_final_score.toFixed(1)})
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {d.by_service.length ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Ranking por servicio</h3>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {d.by_service.map((g) => (
                      <li key={g.service ?? g.top_template_id} className="rounded-md border border-border bg-card p-3 text-sm">
                        <p className="font-medium text-foreground">{g.service}</p>
                        <p className="text-muted-foreground">
                          Top: {g.top_template_id} ({g.top_final_score.toFixed(1)})
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {d.trend_30d.length ? (
                <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground">Tendencia 30 días</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Fecha</th>
                          <th className="py-2 pr-3 font-medium">Outcomes</th>
                          <th className="py-2 pr-3 font-medium">CR avg</th>
                          <th className="py-2 pr-3 font-medium">Leads</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.trend_30d.map((t) => (
                          <tr key={t.date} className="border-b border-border/60">
                            <td className="py-2 pr-3">{t.date}</td>
                            <td className="py-2 pr-3">{t.outcomes_count}</td>
                            <td className="py-2 pr-3">{fmtPct(t.conversion_rate_avg)}</td>
                            <td className="py-2 pr-3">{t.lead_count_total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
