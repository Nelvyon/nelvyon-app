import { useEffect, useState, useCallback } from "react";
import { FileText, Shield, Clock, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, type ModuleAnalyticsContracts } from "@/lib/api";
import {
  PeriodSelector, KPICard, AreaTrendChart, BarDistributionChart,
  PieDistributionChart, AnalyticsLoading, AnalyticsError, AnalyticsSectionHeader,
} from "@/components/ModuleAnalytics";

export default function ContractsAnalyticsTab() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<ModuleAnalyticsContracts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getContractsAnalytics(period);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando analytics Contratos");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AnalyticsLoading />;
  if (error) return <AnalyticsError error={error} onRetry={load} />;
  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AnalyticsSectionHeader title="Analytics Contratos" subtitle={`Datos reales · ${data.source === "postgresql_live" ? "PostgreSQL en vivo" : data.source}`} />
        <PeriodSelector period={period} setPeriod={setPeriod} onRefresh={load} loading={loading} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Total Contratos" value={k.total} icon={FileText} color="violet" />
        <KPICard title="Nuevos" value={k.new.current} icon={FileText} color="blue" delta={k.new} />
        <KPICard title="Activos" value={k.active} icon={Shield} color="emerald" />
        <KPICard title="Borrador" value={k.draft} icon={Clock} color="amber" />
        <KPICard title="Expirados" value={k.expired} icon={AlertTriangle} color="rose" />
        <KPICard title="Clientes Únicos" value={k.unique_clients} icon={Users} color="cyan" />
      </div>

      {/* Rate Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KPICard title="Tasa de Activos" value={k.active_rate} icon={CheckCircle2} color="emerald" suffix="%" />
        <KPICard title="Contratos Nuevos (período anterior)" value={k.new.previous} icon={FileText} color="blue" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaTrendChart
          data={data.charts.trend}
          dataKeys={[{ key: "count", color: "#8B5CF6", name: "Nuevos Contratos" }]}
          title="Tendencia de Creación"
        />
        <PieDistributionChart
          data={data.charts.by_status}
          nameKey="status"
          valueKey="count"
          title="Contratos por Estado"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarDistributionChart
          data={data.charts.by_type}
          nameKey="type"
          valueKey="count"
          title="Contratos por Tipo"
        />
        <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Resumen</h3>
          <div className="space-y-3">
            {[
              { label: "Total contratos", value: k.total, color: "text-white" },
              { label: "Activos", value: k.active, color: "text-emerald-400" },
              { label: "En borrador", value: k.draft, color: "text-amber-400" },
              { label: "Expirados/Cancelados", value: k.expired, color: "text-rose-400" },
              { label: "Clientes con contrato", value: k.unique_clients, color: "text-cyan-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <span className="text-xs text-slate-400">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}