"use client";

import { useEffect, useMemo, useState } from "react";

type LeadCategory = "hot" | "warm" | "cold";
type Lead = {
  id: string;
  name: string;
  email: string;
  score: number;
  category: LeadCategory;
  reasons: string[];
  nextAction: string;
};
type Stats = {
  totalLeads: number;
  avgScore: number;
  hot: number;
  warm: number;
  cold: number;
  topLeads: Array<{ id: string; name: string; email: string; score: number; category: LeadCategory; nextAction: string }>;
};

function badgeClass(category: LeadCategory): string {
  if (category === "hot") return "bg-red-700";
  if (category === "warm") return "bg-orange-700";
  return "bg-blue-700";
}

export default function LeadScoringDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | LeadCategory>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const leadsUrl = categoryFilter === "all" ? "/api/saas/lead-scoring?page=1&pageSize=25" : `/api/saas/lead-scoring?page=1&pageSize=25&category=${categoryFilter}`;
        const [statsRes, leadsRes] = await Promise.all([fetch("/api/saas/lead-scoring/stats"), fetch(leadsUrl)]);
        if (!statsRes.ok || !leadsRes.ok) throw new Error("load_failed");
        const statsData = (await statsRes.json()) as { stats: Stats };
        const leadsData = (await leadsRes.json()) as { items: Lead[] };
        if (!mounted) return;
        setStats(statsData.stats);
        setLeads(leadsData.items ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [categoryFilter]);

  const hotPct = useMemo(() => {
    if (!stats || stats.totalLeads <= 0) return 0;
    return Math.round((stats.hot / stats.totalLeads) * 100);
  }, [stats]);

  if (loading) return <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />;
  if (!stats) return <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">Sin datos de lead scoring.</div>;

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-xs text-zinc-400">Total Leads</p>
          <p className="text-xl font-semibold">{stats.totalLeads}</p>
        </article>
        <article className="rounded-lg border border-red-900 bg-red-950/30 p-3">
          <p className="text-xs text-zinc-300">% Hot</p>
          <p className="text-xl font-semibold text-red-300">{hotPct}%</p>
        </article>
        <article className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-3">
          <p className="text-xs text-zinc-300">Score Medio</p>
          <p className="text-xl font-semibold text-emerald-300">{stats.avgScore.toFixed(1)}</p>
        </article>
      </div>

      <div className="flex gap-2">
        {(["all", "hot", "warm", "cold"] as const).map((f) => (
          <button
            className={`rounded px-3 py-1 text-xs ${categoryFilter === f ? "bg-indigo-700" : "bg-zinc-800 hover:bg-zinc-700"}`}
            key={f}
            onClick={() => setCategoryFilter(f)}
            type="button"
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {leads.map((lead) => (
          <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" key={lead.id}>
            <button className="w-full text-left" onClick={() => setExpandedId((prev) => (prev === lead.id ? null : lead.id))} type="button">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{lead.name}</p>
                  <p className="text-xs text-zinc-400">{lead.email}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${badgeClass(lead.category)}`}>{lead.category}</span>
              </div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Score</span>
                <span>{lead.score}/100</span>
              </div>
              <div className="h-2 rounded bg-zinc-800">
                <div className={`h-2 rounded ${lead.category === "hot" ? "bg-red-500" : lead.category === "warm" ? "bg-orange-500" : "bg-blue-500"}`} style={{ width: `${Math.max(0, Math.min(100, lead.score))}%` }} />
              </div>
              <p className="mt-2 text-xs text-zinc-300">Acción recomendada: {lead.nextAction}</p>
            </button>

            {expandedId === lead.id ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-300">
                {lead.reasons.map((r, idx) => (
                  <li key={`${lead.id}-${idx}`}>{r}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
