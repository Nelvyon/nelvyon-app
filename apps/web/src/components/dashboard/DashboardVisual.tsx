"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ROIChartData = { date: string; revenue: number; spend: number; roi: number };
type TrafficChartData = { date: string; sessions: number; users: number; conversions: number };
type ConversionChartData = { name: string; value: number; percentage: number };
type MRRChartData = { month: string; mrr: number; growth: number };
type DashboardSummary = { roi: ROIChartData[]; traffic: TrafficChartData[]; conversions: ConversionChartData[]; mrr: MRRChartData[] };

const PIE_COLORS = ["#7c3aed", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#6366f1"];

export default function DashboardVisual() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/saas/dashboard-metrics/index");
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { summary: DashboardSummary };
        if (mounted) setSummary(data.summary);
      } catch {
        if (mounted) setError("No se pudieron cargar métricas del dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => setError("No se pudieron cargar métricas del dashboard"));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" key={i} />
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">{error ?? "Sin datos"}</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">ROI y Revenue por día</h3>
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={summary.roi}>
              <CartesianGrid stroke="#27272a" />
              <XAxis dataKey="date" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip />
              <Legend />
              <Line dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} />
              <Line dataKey="roi" name="ROI %" stroke="#7c3aed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">Tráfico diario</h3>
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={summary.traffic}>
              <CartesianGrid stroke="#27272a" />
              <XAxis dataKey="date" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip />
              <Legend />
              <Area dataKey="sessions" name="Sesiones" fill="#0ea5e9" fillOpacity={0.2} stroke="#0ea5e9" />
              <Area dataKey="users" name="Usuarios" fill="#22c55e" fillOpacity={0.2} stroke="#22c55e" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">Conversiones por tipo</h3>
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie cx="50%" cy="50%" data={summary.conversions} dataKey="value" nameKey="name" outerRadius={90}>
                {summary.conversions.map((entry, index) => (
                  <Cell fill={PIE_COLORS[index % PIE_COLORS.length]} key={`${entry.name}-${index}`} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">MRR mensual</h3>
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={summary.mrr}>
              <CartesianGrid stroke="#27272a" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip />
              <Legend />
              <Bar dataKey="mrr" fill="#6366f1" name="MRR" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
