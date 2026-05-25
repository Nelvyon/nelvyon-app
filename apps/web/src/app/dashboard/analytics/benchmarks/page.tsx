"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { SkeletonList } from "@/features/dashboard/components/DashboardTabs";
import { analyticsIntelligenceApi } from "@/features/analytics/api";

const METRIC_LABELS: Record<string, string> = {
  email_open_rate: "Open rate %",
  email_ctr: "CTR %",
  conversion_rate: "Conversión %",
  cac_eur: "CAC €",
  churn_rate: "Churn %",
};

export default function BenchmarksPage() {
  const [sectors, setSectors] = useState<{ id: string; label: string }[]>([]);
  const [sector, setSector] = useState("startup");
  const [metrics, setMetrics] = useState({
    email_open_rate: 24,
    email_ctr: 3.2,
    conversion_rate: 4.1,
    cac_eur: 180,
    churn_rate: 5.5,
  });
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof analyticsIntelligenceApi.compare>> | null>(
    null,
  );

  useEffect(() => {
    analyticsIntelligenceApi.listSectors().then((r) => setSectors(r.items)).catch(() => {});
  }, []);

  async function runCompare() {
    setLoading(true);
    try {
      const data = await analyticsIntelligenceApi.compare({ ...metrics, sector });
      setComparison(data);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(
    () =>
      comparison?.comparisons.map((c) => ({
        name: METRIC_LABELS[c.metric] ?? c.metric,
        cliente: c.client_value,
        sector: c.industry_average,
      })) ?? [],
    [comparison],
  );

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Sector</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setSector(e.target.value)}
              value={sector}
            >
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {Object.entries(metrics).map(([key, val]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-muted-foreground">{METRIC_LABELS[key] ?? key}</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => setMetrics((m) => ({ ...m, [key]: Number(e.target.value) }))}
                step="0.1"
                type="number"
                value={val}
              />
            </div>
          ))}
          <div className="flex items-end">
            <button
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={loading}
              onClick={runCompare}
              type="button"
            >
              Comparar
            </button>
          </div>
        </div>

        {loading && <SkeletonList rows={4} />}
        {comparison && !loading && (
          <>
            <p className="text-sm text-muted-foreground">
              vs {comparison.sector_label} —{" "}
              <span className={comparison.summary.overall === "above_average" ? "text-green-600" : "text-amber-600"}>
                {comparison.summary.overall === "above_average" ? "Por encima de la media" : "Por debajo de la media"}
              </span>
            </p>
            <article className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Cliente vs sector</h2>
              <div className="h-80">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cliente" fill="#6366f1" name="Tu cliente" />
                    <Bar dataKey="sector" fill="#94a3b8" name="Media sector" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                {comparison.comparisons.map((c) => (
                  <li className="flex justify-between rounded-lg bg-muted/40 px-3 py-2" key={c.metric}>
                    <span>{METRIC_LABELS[c.metric] ?? c.metric}</span>
                    <span className={c.verdict === "better" ? "text-green-600" : "text-amber-600"}>
                      {c.diff_percent > 0 ? "+" : ""}
                      {c.diff_percent.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
