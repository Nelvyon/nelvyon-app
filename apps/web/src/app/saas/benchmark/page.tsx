"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import type { BenchmarkDashboard, BenchmarkComparison, BenchmarkRating } from "@nelvyon/saas";

// ── Rating display ──────────────────────────────────────────────────────────────

const RATING_TONE: Record<BenchmarkRating, "success" | "primary" | "warning" | "danger" | "neutral"> = {
  excelente: "success",
  bueno: "primary",
  mejorable: "warning",
  critico: "danger",
  sin_dato: "neutral",
};

const RATING_LABEL: Record<BenchmarkRating, string> = {
  excelente: "Excelente",
  bueno: "Bueno",
  mejorable: "Mejorable",
  critico: "Crítico",
  sin_dato: "Sin dato",
};

function fmt(value: number | null, unit: string): string {
  if (value === null) return "—";
  if (unit === "%") return `${(value * 100).toFixed(1)}%`;
  if (unit === "x") return `${value.toFixed(2)}x`;
  if (unit === "€") return `${value.toFixed(2)}€`;
  return `${value.toFixed(0)}`;
}

/** Normalize values for a comparable bar chart (% → ×100, others raw). */
function chartValue(value: number | null, unit: string): number {
  if (value === null) return 0;
  return unit === "%" ? value * 100 : value;
}

// ── KPI card ────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {hint && <p className="text-white/30 text-[10px] mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Comparison chart ────────────────────────────────────────────────────────────

function ComparisonChart({ comparisons }: { comparisons: BenchmarkComparison[] }) {
  const data = comparisons
    .filter((c) => c.clientValue !== null && c.industryValue !== null)
    .map((c) => ({
      name: c.label,
      Tú: chartValue(c.clientValue, c.unit),
      Industria: chartValue(c.industryValue, c.unit),
      rating: c.rating,
    }));

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: "#0d1929", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Industria" fill="rgba(255,255,255,0.25)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Tú" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.rating === "critico" || d.rating === "mejorable" ? "#f59e0b" : "#0084ff"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function BenchmarkPage() {
  const [dashboard, setDashboard] = useState<BenchmarkDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/benchmark");
      if (res.ok) {
        const d = (await res.json()) as { dashboard: BenchmarkDashboard };
        setDashboard(d.dashboard);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/saas/benchmark/refresh", { method: "POST" });
      if (res.ok) {
        const d = (await res.json()) as { dashboard: BenchmarkDashboard };
        setDashboard(d.dashboard);
        showToast("Benchmark actualizado");
      }
    } finally {
      setRefreshing(false);
    }
  }

  const hasData = dashboard && dashboard.summary.metricsTracked > 0;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="benchmark" />}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Sector Benchmark</h1>
              {dashboard && (
                <NelvyonDsBadge tone="primary">{dashboard.sectorLabel}</NelvyonDsBadge>
              )}
            </div>
            <p className="text-white/50 text-sm mt-1">
              Tus KPIs comparados con las medias de tu industria (últimos {dashboard?.periodDays ?? 30} días)
            </p>
          </div>
          <button
            disabled={refreshing || loading}
            onClick={() => { void handleRefresh(); }}
            className="rounded-xl bg-[#0084ff] px-4 py-2 text-sm text-white font-medium disabled:opacity-50 hover:bg-[#0070dd] transition-colors"
          >
            {refreshing ? "Actualizando…" : "↻ Actualizar"}
          </button>
        </div>

        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando benchmark…</div>
        ) : !hasData ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-14 text-center space-y-3">
            <div className="text-4xl">📊</div>
            <p className="text-white font-semibold">Aún no hay datos suficientes para comparar</p>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              El benchmark se calcula automáticamente a partir de tus campañas de email,
              atribución de leads, métricas de ads y entregables. Lanza una campaña o
              conecta tus cuentas de publicidad y pulsa{" "}
              <strong className="text-white/60">↻ Actualizar</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard label="Puntuación global" value={`${dashboard!.summary.overallScore}%`} hint="métricas ≥ industria" />
              <KpiCard label="Métricas comparadas" value={dashboard!.summary.metricsCompared} />
              <KpiCard label="Sobre la media" value={dashboard!.summary.aboveIndustry} hint="industria" />
              <KpiCard label="Bajo la media" value={dashboard!.summary.belowIndustry} hint="industria" />
            </div>

            {dashboard!.degraded && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-yellow-200 text-xs">
                Datos parciales — algunas métricas no tienen origen conectado todavía.
              </div>
            )}

            {/* Chart */}
            <ComparisonChart comparisons={dashboard!.comparisons} />

            {/* Comparison table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Métrica</th>
                    <th className="px-4 py-3 text-right">Tú</th>
                    <th className="px-4 py-3 text-right">Industria</th>
                    <th className="px-4 py-3 text-right">Δ</th>
                    <th className="px-4 py-3 text-left">Valoración</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard!.comparisons.map((c) => (
                    <tr key={c.key} className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/80 text-xs">{c.label}</td>
                      <td className="px-4 py-3 text-right text-white font-medium text-xs">{fmt(c.clientValue, c.unit)}</td>
                      <td className="px-4 py-3 text-right text-white/50 text-xs">{fmt(c.industryValue, c.unit)}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        {c.deltaPct === null ? (
                          <span className="text-white/20">—</span>
                        ) : (
                          <span className={
                            (c.higherBetter ? c.deltaPct >= 0 : c.deltaPct <= 0)
                              ? "text-green-400"
                              : "text-yellow-400"
                          }>
                            {c.deltaPct >= 0 ? "+" : ""}{c.deltaPct.toFixed(0)}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <NelvyonDsBadge tone={RATING_TONE[c.rating]}>{RATING_LABEL[c.rating]}</NelvyonDsBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Data sources footer */}
            {dashboard!.dataSources.length > 0 && (
              <p className="text-white/30 text-[11px]">
                Fuentes: {dashboard!.dataSources.join(" · ")}
              </p>
            )}
          </>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#0084ff] px-4 py-2 text-white text-sm shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}
