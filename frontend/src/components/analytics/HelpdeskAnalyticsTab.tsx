import { useEffect, useState, useCallback } from "react";
import { Headphones, Clock, CheckCircle2, AlertTriangle, Star, Zap, MessageSquare, BarChart3 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { api, getApiErrorMessage, type ModuleAnalyticsHelpdesk } from "@/lib/api";
import { toast } from "sonner";
import {
  PeriodSelector, KPICard, AreaTrendChart, BarDistributionChart,
  PieDistributionChart, AnalyticsLoading, AnalyticsError, AnalyticsSectionHeader,
} from "@/components/ModuleAnalytics";

export default function HelpdeskAnalyticsTab() {
  const { activeWorkspace } = useWorkspace();
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<ModuleAnalyticsHelpdesk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setData(null);
      setError("Selecciona un workspace para ver analytics Helpdesk (requiere X-Workspace-Id).");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHelpdeskAnalytics(period);
      setData(res);
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, "Error cargando analytics Helpdesk");
      setError(msg);
      if (activeWorkspace?.id) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [period, activeWorkspace?.id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <AnalyticsLoading />;
  if (error) return <AnalyticsError error={error} onRetry={load} />;
  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AnalyticsSectionHeader
          title="Analytics Helpdesk"
          subtitle={`Workspace #${data.workspace_id ?? activeWorkspace?.id ?? "—"} · ${data.source === "postgresql_live" ? "PostgreSQL en vivo" : data.source}`}
        />
        <PeriodSelector period={period} setPeriod={setPeriod} onRefresh={load} loading={loading} />
      </div>

      {data.error ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100" role="status">
          <span className="font-medium">Aviso del servidor: </span>
          {data.error}
        </div>
      ) : null}

      {k.total === 0 && !data.error ? (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-400" role="status">
          No hay datos de tickets en este periodo para este workspace. Los KPI y gráficos muestran ceros; no indica fallo de conexión.
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Total Tickets" value={k.total} icon={Headphones} color="violet" />
        <KPICard title="Nuevos Tickets" value={k.new_tickets.current} icon={Headphones} color="blue" delta={k.new_tickets} />
        <KPICard title="Abiertos" value={k.open} icon={Clock} color="amber" />
        <KPICard title="Resueltos" value={k.resolved.current} icon={CheckCircle2} color="emerald" delta={k.resolved} />
        <KPICard title="Tasa Resolución" value={k.resolution_rate} icon={Zap} color="cyan" suffix="%" />
        <KPICard title="Satisfacción" value={k.avg_satisfaction} icon={Star} color="orange" suffix="/5" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard title="Tiempo Resp. Promedio" value={k.avg_first_response_min} icon={Clock} color="blue" suffix=" min" />
        <KPICard title="Total Resueltos" value={k.resolved_total} icon={CheckCircle2} color="emerald" />
        <KPICard title="Tickets Anteriores" value={k.new_tickets.previous} icon={Headphones} color="violet" subtitle="Período anterior" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaTrendChart
          data={data.charts.trend}
          dataKeys={[
            { key: "opened", color: "#F59E0B", name: "Abiertos" },
            { key: "resolved", color: "#10B981", name: "Resueltos" },
          ]}
          title="Tendencia Tickets Abiertos vs Resueltos"
        />
        <PieDistributionChart
          data={data.charts.by_priority}
          nameKey="priority"
          valueKey="count"
          title="Tickets por Prioridad"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarDistributionChart
          data={data.charts.by_category}
          nameKey="category"
          valueKey="count"
          title="Tickets por Categoría"
        />
        <PieDistributionChart
          data={data.charts.by_channel}
          nameKey="channel"
          valueKey="count"
          title="Tickets por Canal"
        />
      </div>
    </div>
  );
}