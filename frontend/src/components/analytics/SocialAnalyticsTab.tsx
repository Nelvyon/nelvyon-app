import { useEffect, useState, useCallback } from "react";
import { Share2, Eye, Heart, MousePointerClick, MessageCircle, TrendingUp, Zap, Send } from "lucide-react";
import { api, type ModuleAnalyticsSocial } from "@/lib/api";
import {
  PeriodSelector, KPICard, AreaTrendChart, BarDistributionChart,
  PieDistributionChart, AnalyticsLoading, AnalyticsError, AnalyticsSectionHeader,
} from "@/components/ModuleAnalytics";

export default function SocialAnalyticsTab() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<ModuleAnalyticsSocial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSocialAnalytics(period);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando analytics Social");
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
        <AnalyticsSectionHeader title="Analytics Social" subtitle={`Datos reales · ${data.source === "postgresql_live" ? "PostgreSQL en vivo" : data.source}`} />
        <PeriodSelector period={period} setPeriod={setPeriod} onRefresh={load} loading={loading} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Posts Totales" value={k.total_posts} icon={Share2} color="violet" />
        <KPICard title="Nuevos Posts" value={k.new_posts.current} icon={Send} color="blue" delta={k.new_posts} />
        <KPICard title="Publicados" value={k.published} icon={Share2} color="emerald" />
        <KPICard title="Programados" value={k.scheduled} icon={Share2} color="amber" />
        <KPICard title="Impresiones" value={k.impressions_total} icon={Eye} color="cyan" delta={k.impressions} />
        <KPICard title="Engagement Rate" value={k.engagement_rate} icon={TrendingUp} color="orange" suffix="%" />
      </div>

      {/* Engagement KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard title="Likes" value={k.likes} icon={Heart} color="rose" />
        <KPICard title="Comentarios" value={k.comments} icon={MessageCircle} color="blue" />
        <KPICard title="Compartidos" value={k.shares} icon={Share2} color="violet" />
        <KPICard title="Clicks" value={k.clicks} icon={MousePointerClick} color="cyan" />
        <KPICard title="Fallidos" value={k.failed} icon={Zap} color="rose" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaTrendChart
          data={data.charts.trend}
          dataKeys={[
            { key: "posts", color: "#8B5CF6", name: "Posts" },
            { key: "impressions", color: "#06B6D4", name: "Impresiones" },
          ]}
          title="Tendencia de Publicaciones e Impresiones"
        />
        <PieDistributionChart
          data={data.charts.by_platform}
          nameKey="platform"
          valueKey="count"
          title="Posts por Plataforma"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <BarDistributionChart
          data={data.charts.by_platform}
          nameKey="platform"
          valueKey="impressions"
          title="Impresiones por Plataforma"
        />
      </div>
    </div>
  );
}