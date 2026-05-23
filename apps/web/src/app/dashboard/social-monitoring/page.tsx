"use client";

import { Plus, Radio, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { dashboardSocialMonitoringApi } from "@/features/dashboard/api";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

type Row = Record<string, unknown>;

interface SentimentDay {
  day: string;
  avg_score: number;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

const PLATFORMS = [
  { id: "web", label: "Web" },
  { id: "news", label: "Noticias / RSS" },
  { id: "twitter", label: "X / Twitter" },
  { id: "reddit", label: "Reddit" },
] as const;

function str(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

function sentimentClass(s: string): string {
  if (s === "positive") return "border-emerald-500/40 bg-emerald-500/10";
  if (s === "negative") return "border-red-500/40 bg-red-500/10";
  return "border-border bg-muted/40";
}

function sentimentLabel(s: string): string {
  if (s === "positive") return "Positivo";
  if (s === "negative") return "Negativo";
  return "Neutro";
}

export default function SocialMonitoringPage() {
  const [dashboard, setDashboard] = useState<Row>({});
  const [mentions, setMentions] = useState<Row[]>([]);
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [chart, setChart] = useState<SentimentDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filters, setFilters] = useState({
    alert_id: "",
    sentiment: "",
    platform: "",
    since: "",
  });
  const [form, setForm] = useState({
    keyword: "",
    platforms: ["web", "news"] as string[],
    notify_email: "",
  });

  const loadDashboard = useCallback(async (refresh = false) => {
    const data = await dashboardSocialMonitoringApi.dashboard(refresh);
    setDashboard(data);
    setAlerts((data.alerts as Row[]) ?? []);
    setChart((data.sentiment_by_day as SentimentDay[]) ?? []);
  }, []);

  const loadMentions = useCallback(async () => {
    const res = await dashboardSocialMonitoringApi.mentions({
      alert_id: filters.alert_id || undefined,
      sentiment: filters.sentiment || undefined,
      platform: filters.platform || undefined,
      since: filters.since || undefined,
    });
    setMentions(res.items ?? []);
  }, [filters]);

  const loadAll = useCallback(
    async (refresh = false) => {
      setLoading(true);
      try {
        await Promise.all([loadDashboard(refresh), loadMentions()]);
      } catch {
        setDashboard({});
        setMentions([]);
        setAlerts([]);
        setChart([]);
      } finally {
        setLoading(false);
      }
    },
    [loadDashboard, loadMentions],
  );

  useEffect(() => {
    loadAll(true).catch(() => undefined);
  }, [loadAll]);

  useEffect(() => {
    loadMentions().catch(() => setMentions([]));
  }, [loadMentions]);

  useEffect(() => {
    const id = window.setInterval(() => {
      loadAll(true).catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [loadAll]);

  const metrics = useMemo(
    () => [
      { label: "Menciones hoy", value: String(dashboard.mentions_24h ?? 0) },
      { label: "% positivas", value: `${dashboard.positive_percent ?? 0}%` },
      { label: "% negativas", value: `${dashboard.negative_percent ?? 0}%` },
      { label: "Alertas activas", value: String(dashboard.active_alerts ?? alerts.length) },
    ],
    [dashboard, alerts.length],
  );

  async function createAlert() {
    if (!form.keyword.trim()) return;
    await dashboardSocialMonitoringApi.createAlert({
      keyword: form.keyword.trim(),
      platforms: form.platforms,
      notify_email: form.notify_email || undefined,
    });
    setModal(false);
    setForm({ keyword: "", platforms: ["web", "news"], notify_email: "" });
    await loadAll(true);
  }

  async function deleteAlert(id: string) {
    await dashboardSocialMonitoringApi.deleteAlert(id);
    await loadAll(true);
  }

  async function handleMention(id: string) {
    await dashboardSocialMonitoringApi.handleMention(id);
    await loadAll(false);
  }

  const maxChartTotal = Math.max(...chart.map((d) => d.total), 1);

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Radio className="h-7 w-7 text-primary" aria-hidden />
              Social Monitoring
            </h1>
            <p className="text-sm text-muted-foreground">
              Menciones en la web, sentimiento y alertas por keyword — actualización cada 30 s
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadAll(true)} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Actualizar
            </Button>
            <Button onClick={() => setModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva alerta
            </Button>
          </div>
        </div>

        <MetricGrid items={metrics} loading={loading} />

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-semibold">Sentimiento por día (7 días)</h2>
          {chart.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos todavía. Crea una alerta para empezar a monitorizar.</p>
          ) : (
            <div className="flex items-end gap-2 overflow-x-auto pb-2">
              {chart.map((day) => {
                const height = Math.max(8, Math.round((day.total / maxChartTotal) * 96));
                const posH = day.total ? Math.round((day.positive / day.total) * height) : 0;
                const negH = day.total ? Math.round((day.negative / day.total) * height) : 0;
                const neuH = Math.max(0, height - posH - negH);
                return (
                  <div key={day.day} className="flex min-w-[48px] flex-col items-center gap-1">
                    <div className="flex h-24 w-8 flex-col-reverse overflow-hidden rounded-md border border-border">
                      {posH > 0 ? <div className="bg-emerald-500" style={{ height: posH }} title={`+${day.positive}`} /> : null}
                      {neuH > 0 ? <div className="bg-muted-foreground/40" style={{ height: neuH }} title={`=${day.neutral}`} /> : null}
                      {negH > 0 ? <div className="bg-red-500" style={{ height: negH }} title={`-${day.negative}`} /> : null}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{day.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            <h2 className="text-sm font-semibold">Feed de menciones</h2>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => setFilters({ ...filters, alert_id: e.target.value })}
                value={filters.alert_id}
              >
                <option value="">Todas las alertas</option>
                {alerts.map((a) => (
                  <option key={str(a.id)} value={str(a.id, "")}>
                    {str(a.keyword)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                value={filters.sentiment}
              >
                <option value="">Todo sentimiento</option>
                <option value="positive">Positivo</option>
                <option value="neutral">Neutro</option>
                <option value="negative">Negativo</option>
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                value={filters.platform}
              >
                <option value="">Todas las plataformas</option>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => setFilters({ ...filters, since: e.target.value })}
                type="date"
                value={filters.since}
              />
            </div>

            <div className="space-y-2">
              {mentions.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay menciones con estos filtros.
                </p>
              ) : (
                mentions.map((m) => {
                  const sent = str(m.sentiment, "neutral");
                  const handled = Boolean(m.is_handled);
                  return (
                    <article
                      key={str(m.id)}
                      className={cn("rounded-lg border p-4 text-sm", sentimentClass(sent), handled && "opacity-60")}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded bg-background/80 px-2 py-0.5 font-medium uppercase">{str(m.platform)}</span>
                          <span>{str(m.author)}</span>
                          <span>{str(m.found_at).slice(0, 16).replace("T", " ")}</span>
                          <span className="font-medium text-foreground">{sentimentLabel(sent)}</span>
                        </div>
                        {!handled ? (
                          <Button size="sm" variant="outline" onClick={() => handleMention(str(m.id, ""))}>
                            Gestionar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Gestionada</span>
                        )}
                      </div>
                      <p className="text-foreground">{str(m.text)}</p>
                      {m.url ? (
                        <a
                          className="mt-2 inline-block text-xs text-primary underline"
                          href={str(m.url, "#")}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Ver fuente
                        </a>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Mis alertas</h2>
            {alerts.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Sin alertas. Pulsa «Nueva alerta» para monitorizar una keyword.
              </p>
            ) : (
              alerts.map((a) => {
                const plats = Array.isArray(a.platforms) ? (a.platforms as string[]) : [];
                return (
                  <div key={str(a.id)} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{str(a.keyword)}</p>
                        <p className="text-xs text-muted-foreground">
                          {plats.join(", ") || "web, news"}
                          {a.notify_email ? ` · ${str(a.notify_email)}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-emerald-600">Activa</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => deleteAlert(str(a.id, ""))} aria-label="Eliminar alerta">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nueva alerta de monitoreo">
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Keyword</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, keyword: e.target.value })}
              placeholder="Ej. NELVYON, mi marca…"
              value={form.keyword}
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Plataformas</legend>
            {PLATFORMS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  checked={form.platforms.includes(p.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...form.platforms, p.id]
                      : form.platforms.filter((x) => x !== p.id);
                    setForm({ ...form, platforms: next.length ? next : ["web"] });
                  }}
                  type="checkbox"
                />
                {p.label}
              </label>
            ))}
          </fieldset>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email de notificación (opcional)</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
              placeholder="alertas@tuempresa.com"
              type="email"
              value={form.notify_email}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={createAlert}>Crear alerta</Button>
          </div>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
