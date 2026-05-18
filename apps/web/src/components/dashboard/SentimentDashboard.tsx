"use client";

import { useEffect, useMemo, useState } from "react";

type TrendPoint = { date: string; avgScore: number };
type ChannelDist = { channel: string; avgScore: number; total: number; positive: number; neutral: number; negative: number };
type Mention = { id: string; channel: string; text: string; label: "positive" | "neutral" | "negative"; score: number; createdAt: string };
type Alert = { id: string; avgScore: number; createdAt: string; status: string };
type Stats = { avgScore: number; totalMentions: number; trend: TrendPoint[]; channels: ChannelDist[] };

function scoreColor(score: number): string {
  if (score < -0.3) return "text-red-400";
  if (score > 0.3) return "text-emerald-400";
  return "text-yellow-300";
}

function scoreBar(score: number): string {
  if (score < -0.3) return "bg-red-500";
  if (score > 0.3) return "bg-emerald-500";
  return "bg-yellow-500";
}

export default function SentimentDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const [statsRes, mentionsRes, alertsRes] = await Promise.all([
          fetch("/api/saas/sentiment/stats?period=30d"),
          fetch("/api/saas/sentiment?page=1&pageSize=6"),
          fetch("/api/saas/sentiment/alerts"),
        ]);
        if (!statsRes.ok || !mentionsRes.ok || !alertsRes.ok) throw new Error("load_failed");
        const statsData = (await statsRes.json()) as { stats: Stats };
        const mentionsData = (await mentionsRes.json()) as { items: Mention[] };
        const alertsData = (await alertsRes.json()) as { alerts: Alert[] };
        if (!mounted) return;
        setStats(statsData.stats);
        setMentions(mentionsData.items ?? []);
        setAlerts(alertsData.alerts ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const gaugePct = useMemo(() => {
    const score = stats?.avgScore ?? 0;
    return Math.max(0, Math.min(100, Math.round(((score + 1) / 2) * 100)));
  }, [stats]);

  if (loading) return <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />;
  if (!stats) return <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">Sin datos de sentimiento.</div>;

  const trendMax = Math.max(1, ...stats.trend.map((t) => Math.abs(t.avgScore)));

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      {alerts.length > 0 ? (
        <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Alertas activas: el sentimiento cayó por debajo de -0.3 en las últimas 24h.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <h3 className="mb-2 text-sm font-semibold">Score global</h3>
          <div className="h-3 rounded bg-zinc-800">
            <div className={`h-3 rounded ${scoreBar(stats.avgScore)}`} style={{ width: `${gaugePct}%` }} />
          </div>
          <p className={`mt-2 text-lg font-semibold ${scoreColor(stats.avgScore)}`}>{stats.avgScore.toFixed(2)} / 1.00</p>
        </article>

        <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <h3 className="mb-2 text-sm font-semibold">Tendencia 30 días</h3>
          <div className="flex h-24 items-end gap-1">
            {stats.trend.map((p) => {
              const h = Math.max(6, Math.round((Math.abs(p.avgScore) / trendMax) * 80));
              const up = p.avgScore >= 0;
              return <div className={`w-2 rounded ${up ? "bg-emerald-500" : "bg-red-500"}`} key={p.date} style={{ height: `${h}px` }} title={`${p.date}: ${p.avgScore.toFixed(2)}`} />;
            })}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <h3 className="mb-2 text-sm font-semibold">Canales</h3>
        <div className="space-y-2">
          {stats.channels.map((c) => {
            const pct = Math.max(0, Math.min(100, Math.round(((c.avgScore + 1) / 2) * 100)));
            return (
              <div key={c.channel}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{c.channel}</span>
                  <span>{c.avgScore.toFixed(2)}</span>
                </div>
                <div className="h-2 rounded bg-zinc-800">
                  <div className={`h-2 rounded ${scoreBar(c.avgScore)}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <h3 className="mb-2 text-sm font-semibold">Menciones recientes</h3>
        <div className="space-y-2">
          {mentions.map((m) => (
            <div className="rounded border border-zinc-800 bg-zinc-950 p-2" key={m.id}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-zinc-400">{m.channel}</span>
                <span
                  className={`rounded px-2 py-0.5 ${
                    m.label === "positive" ? "bg-emerald-700" : m.label === "negative" ? "bg-red-700" : "bg-yellow-700"
                  }`}
                >
                  {m.label}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-zinc-300">{m.text}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
