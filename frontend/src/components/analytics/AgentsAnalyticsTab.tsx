import { useEffect, useState, useCallback } from "react";
import { Bot, Zap, CheckCircle2, AlertTriangle, Activity, Clock, TrendingUp, Cpu } from "lucide-react";
import { api, type ModuleAnalyticsAgents } from "@/lib/api";
import {
  KPICard, PieDistributionChart, AnalyticsLoading, AnalyticsError, AnalyticsSectionHeader,
} from "@/components/ModuleAnalytics";
import { cn } from "@/lib/utils";
import { RefreshCw, Loader2 } from "lucide-react";

export default function AgentsAnalyticsTab() {
  const [data, setData] = useState<ModuleAnalyticsAgents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentsAnalytics();
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando analytics Agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AnalyticsLoading />;
  if (error) return <AnalyticsError error={error} onRetry={load} />;
  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AnalyticsSectionHeader title="Analytics Agentes IA" subtitle={`Datos reales · ${data.source === "postgresql_live" ? "PostgreSQL en vivo" : data.source}`} />
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg bg-[#1A1D23] border border-white/[0.06] text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Agentes" value={k.total} icon={Bot} color="violet" />
        <KPICard title="Activos" value={k.active} icon={CheckCircle2} color="emerald" />
        <KPICard title="En Espera" value={k.idle} icon={Clock} color="amber" />
        <KPICard title="Con Error" value={k.error} icon={AlertTriangle} color="rose" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Tasa Éxito Prom." value={k.avg_success_rate} icon={TrendingUp} color="emerald" suffix="%" />
        <KPICard title="Tareas Completadas" value={k.total_tasks_completed} icon={Zap} color="violet" />
        <KPICard title="Tareas Hoy" value={k.tasks_today} icon={Activity} color="blue" />
        <KPICard title="Uptime Rate" value={k.uptime_rate} icon={Cpu} color="cyan" suffix="%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieDistributionChart
          data={data.charts.by_status}
          nameKey="status"
          valueKey="count"
          title="Agentes por Estado"
        />

        {/* Top Agents Table */}
        <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Agentes por Rendimiento</h3>
          {data.charts.top_agents.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Sin datos de agentes</div>
          ) : (
            <div className="space-y-2">
              {data.charts.top_agents.map((agent, i) => {
                const statusColor = agent.status === "active" ? "bg-emerald-500" :
                  agent.status === "idle" ? "bg-amber-500" : "bg-rose-500";
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 font-bold text-sm">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                        <span className={cn("w-2 h-2 rounded-full", statusColor)} />
                      </div>
                      <span className="text-[10px] text-slate-500">{agent.agent_id}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{agent.tasks_completed.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">{agent.success_rate}% éxito</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}