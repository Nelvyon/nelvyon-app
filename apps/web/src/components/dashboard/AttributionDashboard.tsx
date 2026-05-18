"use client";

import { useEffect, useMemo, useState } from "react";

type ModelKey = "first_touch" | "last_touch" | "linear" | "time_decay" | "position_based";
type PeriodPreset = "7d" | "30d" | "90d" | "custom";

type ChannelResult = {
  channel: string;
  credit: number;
  conversions: number;
  revenue: number;
};

type AttributionReport = {
  id: string;
  model: ModelKey;
  results: ChannelResult[];
};

type Touchpoint = {
  channel: string;
  occurredAt: string;
};

const accent = "#9333ea";
const models: Array<{ id: ModelKey; label: string }> = [
  { id: "first_touch", label: "First Touch" },
  { id: "last_touch", label: "Last Touch" },
  { id: "linear", label: "Linear" },
  { id: "time_decay", label: "Time Decay" },
  { id: "position_based", label: "Position Based" },
];

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function channelTouchCount(touchpoints: Touchpoint[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of touchpoints) out[t.channel] = (out[t.channel] ?? 0) + 1;
  return out;
}

export default function AttributionDashboard() {
  const [model, setModel] = useState<ModelKey>("first_touch");
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState<AttributionReport | null>(null);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [comparison, setComparison] = useState<Record<ModelKey, AttributionReport> | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const periodRange = useMemo(() => {
    if (period === "7d") return { start: isoDateDaysAgo(7), end: new Date().toISOString() };
    if (period === "30d") return { start: isoDateDaysAgo(30), end: new Date().toISOString() };
    if (period === "90d") return { start: isoDateDaysAgo(90), end: new Date().toISOString() };
    return {
      start: customFrom ? new Date(customFrom).toISOString() : null,
      end: customTo ? new Date(customTo).toISOString() : null,
    };
  }, [period, customFrom, customTo]);

  async function loadReport(selectedModel: ModelKey): Promise<void> {
    setLoading(true);
    setStatus("");
    try {
      const [repRes, touchRes] = await Promise.all([
        fetch("/api/os/attribution/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel, periodStart: periodRange.start, periodEnd: periodRange.end }),
        }),
        fetch(
          `/api/os/attribution/touchpoints?${new URLSearchParams({
            ...(periodRange.start ? { dateFrom: periodRange.start } : {}),
            ...(periodRange.end ? { dateTo: periodRange.end } : {}),
          }).toString()}`,
        ),
      ]);
      if (!repRes.ok || !touchRes.ok) throw new Error("load_failed");
      const repData = (await repRes.json()) as { report: AttributionReport };
      const touchData = (await touchRes.json()) as { touchpoints: Touchpoint[] };
      setReport(repData.report);
      setTouchpoints(touchData.touchpoints ?? []);
    } catch {
      setStatus("No se pudo cargar el reporte de atribución");
      setReport(null);
      setTouchpoints([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport(model);
  }, [model, periodRange.start, periodRange.end]); // eslint-disable-line react-hooks/exhaustive-deps

  async function compareModels(): Promise<void> {
    setStatus("");
    try {
      const res = await fetch("/api/os/attribution/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compare", periodStart: periodRange.start, periodEnd: periodRange.end }),
      });
      if (!res.ok) throw new Error("compare_failed");
      const data = (await res.json()) as { reports: Record<ModelKey, AttributionReport> };
      setComparison(data.reports);
    } catch {
      setStatus("No se pudo comparar modelos");
      setComparison(null);
    }
  }

  const touchCount = channelTouchCount(touchpoints);
  const bestCredit = Math.max(1, ...(report?.results ?? []).map((r) => r.credit));

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: accent }}>
            Atribución Cross-Canal
          </h2>
          <p className="text-sm text-zinc-400">Modelo multi-touch automático por canal.</p>
        </div>
        <button
          type="button"
          className="rounded px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: accent }}
          onClick={() => void compareModels()}
        >
          Comparar modelos
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {models.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`rounded px-3 py-1.5 text-sm ${model === m.id ? "text-white" : "border border-zinc-700 text-zinc-400"}`}
            style={model === m.id ? { backgroundColor: accent } : undefined}
            onClick={() => setModel(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <select
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
        >
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
          <option value="90d">Last 90d</option>
          <option value="custom">Custom</option>
        </select>
        {period === "custom" ? (
          <>
            <input
              type="date"
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <input
              type="date"
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-zinc-400">Calculando modelo…</p> : null}

      <div className="space-y-2">
        {(report?.results ?? []).map((r) => (
          <div key={r.channel}>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
              <span>{r.channel}</span>
              <span>{r.credit.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded bg-zinc-800">
              <div
                className="h-3 rounded"
                style={{
                  width: `${Math.max(2, Math.round((r.credit / bestCredit) * 100))}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-2 py-1">Canal</th>
              <th className="px-2 py-1">Touchpoints</th>
              <th className="px-2 py-1">Conversiones</th>
              <th className="px-2 py-1">Revenue</th>
              <th className="px-2 py-1">Crédito %</th>
            </tr>
          </thead>
          <tbody>
            {(report?.results ?? []).map((r) => (
              <tr key={`row-${r.channel}`} className="border-t border-zinc-800">
                <td className="px-2 py-2">{r.channel}</td>
                <td className="px-2 py-2">{touchCount[r.channel] ?? 0}</td>
                <td className="px-2 py-2">{r.conversions.toFixed(2)}</td>
                <td className="px-2 py-2">{r.revenue.toFixed(2)}</td>
                <td className="px-2 py-2">{r.credit.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comparison ? (
        <div className="mt-6 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold text-zinc-200">Comparativa modelos</h3>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-2 py-1">Modelo</th>
                <th className="px-2 py-1">Top canal</th>
                <th className="px-2 py-1">Top crédito %</th>
                <th className="px-2 py-1">Revenue atribuido total</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const rep = comparison[m.id];
                const top = rep?.results?.[0];
                const totalRevenue = (rep?.results ?? []).reduce((s, r) => s + r.revenue, 0);
                return (
                  <tr key={`cmp-${m.id}`} className="border-t border-zinc-800">
                    <td className="px-2 py-2">{m.label}</td>
                    <td className="px-2 py-2">{top?.channel ?? "—"}</td>
                    <td className="px-2 py-2">{top ? `${top.credit.toFixed(2)}%` : "—"}</td>
                    <td className="px-2 py-2">{totalRevenue.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
