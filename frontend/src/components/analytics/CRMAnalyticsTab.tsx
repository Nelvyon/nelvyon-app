import { useEffect, useState, useCallback } from "react";
import { Users, Target, Activity, TrendingUp, Star, Zap } from "lucide-react";
import { api, type ModuleAnalyticsCRM } from "@/lib/api";
import {
  PeriodSelector, KPICard, AreaTrendChart, BarDistributionChart,
  PieDistributionChart, AnalyticsLoading, AnalyticsError, AnalyticsSectionHeader,
} from "@/components/ModuleAnalytics";

export default function CRMAnalyticsTab() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<ModuleAnalyticsCRM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCRMAnalytics(period);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando analytics CRM");
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
        <AnalyticsSectionHeader title="Analytics CRM" subtitle={`Datos reales · ${data.source === "postgresql_live" ? "PostgreSQL en vivo" : data.source}`} />
        <PeriodSelector period={period} setPeriod={setPeriod} onRefresh={load} loading={loading} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Contactos Total" value={k.contacts_total} icon={Users} color="blue" />
        <KPICard title="Nuevos Contactos" value={k.contacts_new.current} icon={Users} color="cyan" delta={k.contacts_new} />
        <KPICard title="Score Promedio" value={k.avg_score} icon={Star} color="amber" />
        <KPICard title="Deals Total" value={k.deals_total} icon={Target} color="emerald" />
        <KPICard title="Valor Pipeline" value={k.deals_value.current} icon={TrendingUp} color="violet" prefix="€" delta={k.deals_value} />
        <KPICard title="Win Rate" value={k.win_rate} icon={Zap} color="orange" suffix="%" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Deals Ganados" value={k.deals_won} icon={Target} color="emerald" />
        <KPICard title="Deals Perdidos" value={k.deals_lost} icon={Target} color="rose" />
        <KPICard title="Nuevos Deals" value={k.deals_new.current} icon={Target} color="blue" delta={k.deals_new} />
        <KPICard title="Actividades" value={k.activities.current} icon={Activity} color="violet" delta={k.activities} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaTrendChart
          data={data.charts.contacts_trend}
          dataKeys={[{ key: "count", color: "#3B82F6", name: "Nuevos Contactos" }]}
          title="Tendencia de Nuevos Contactos"
        />
        <BarDistributionChart
          data={data.charts.deals_by_stage}
          nameKey="stage"
          valueKey="count"
          title="Deals por Etapa"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieDistributionChart
          data={data.charts.contacts_by_source}
          nameKey="source"
          valueKey="count"
          title="Contactos por Fuente"
        />
        <PieDistributionChart
          data={data.charts.contacts_by_status}
          nameKey="status"
          valueKey="count"
          title="Contactos por Estado"
        />
      </div>
    </div>
  );
}