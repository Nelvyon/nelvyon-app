/**
 * Reusable analytics components for module KPI dashboards.
 * Used by CRM, Contracts, Social, Helpdesk, and Agents pages.
 */
import { cn } from "@/lib/utils";
import type { DeltaMetric } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Period Selector ───
const PERIODS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "1y", label: "1y" },
];

export function PeriodSelector({
  period, setPeriod, onRefresh, loading,
}: {
  period: string; setPeriod: (p: string) => void; onRefresh?: () => void; loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-[#1A1D23] rounded-lg p-0.5 border border-white/[0.06]">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              period === p.key
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-[#1A1D23] border border-white/[0.06] text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

// ─── KPI Card ───
export function KPICard({
  title, value, subtitle, icon: Icon, delta, color = "violet", prefix = "", suffix = "",
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  delta?: DeltaMetric | null;
  color?: "violet" | "blue" | "emerald" | "amber" | "rose" | "cyan" | "orange";
  prefix?: string;
  suffix?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", glow: "shadow-violet-500/5" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", glow: "shadow-blue-500/5" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-emerald-500/5" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", glow: "shadow-amber-500/5" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", glow: "shadow-rose-500/5" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", glow: "shadow-cyan-500/5" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", glow: "shadow-orange-500/5" },
  };
  const c = colorMap[color] || colorMap.violet;

  return (
    <div className={cn(
      "relative rounded-xl border p-5 transition-all hover:scale-[1.02]",
      "bg-[#12141A] border-white/[0.06] shadow-xl", c.glow
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", c.bg)}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
        {delta && <DeltaBadge delta={delta} />}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
      </div>
      <div className="text-xs text-slate-500 mt-1 font-medium">{title}</div>
      {subtitle && <div className="text-[10px] text-slate-600 mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ─── Delta Badge ───
export function DeltaBadge({ delta }: { delta: DeltaMetric }) {
  const isUp = delta.delta_pct > 0;
  const isDown = delta.delta_pct < 0;
  const isFlat = delta.delta_pct === 0;

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
      isUp && "bg-emerald-500/10 text-emerald-400",
      isDown && "bg-rose-500/10 text-rose-400",
      isFlat && "bg-slate-500/10 text-slate-400",
    )}>
      {isUp && <TrendingUp className="w-3 h-3" />}
      {isDown && <TrendingDown className="w-3 h-3" />}
      {isFlat && <Minus className="w-3 h-3" />}
      {isUp ? "+" : ""}{delta.delta_pct}%
    </div>
  );
}

// ─── Chart Tooltip ───
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1A1D23] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="text-white font-medium">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Area Trend Chart ───
export function AreaTrendChart({
  data, dataKeys, title, height = 260,
}: {
  data: Record<string, unknown>[];
  dataKeys: { key: string; color: string; name: string }[];
  title: string;
  height?: number;
}) {
  return (
    <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Sin datos en este período</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {dataKeys.map((dk) => (
                <linearGradient key={dk.key} id={`grad_${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={dk.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={dk.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2028" />
            <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<ChartTooltip />} />
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color}
                fill={`url(#grad_${dk.key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Bar Distribution Chart ───
const BAR_COLORS = ["#8B5CF6", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#F97316"];

export function BarDistributionChart({
  data, nameKey, valueKey, title, height = 260,
}: {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  title: string;
  height?: number;
}) {
  return (
    <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Sin datos</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2028" />
            <XAxis dataKey={nameKey} tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey={valueKey} radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Pie Distribution Chart ───
export function PieDistributionChart({
  data, nameKey, valueKey, title, height = 260,
}: {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  title: string;
  height?: number;
}) {
  return (
    <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Sin datos</div>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="60%" height={height}>
            <PieChart>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {data.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                <span className="text-slate-400 truncate">{String(item[nameKey] || "—")}</span>
                <span className="text-white font-semibold ml-auto">{Number(item[valueKey] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Loading State ───
export function AnalyticsLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      <p className="text-sm text-slate-500">Cargando analytics en tiempo real...</p>
    </div>
  );
}

// ─── Analytics Error State ───
export function AnalyticsError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#12141A] rounded-xl border border-white/[0.06]">
      <p className="text-sm text-rose-400">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-violet-400 hover:text-violet-300 underline">
          Reintentar
        </button>
      )}
    </div>
  );
}

// ─── Section Header ───
export function AnalyticsSectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}