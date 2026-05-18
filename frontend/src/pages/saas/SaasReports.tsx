import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import SaasLayout from "@/components/SaasLayout";
import DataStateWrapper from "@/components/DataStateWrapper";
import { Button } from "@/components/ui/button";
import {
  PieChart, Loader2, Sparkles, CheckCircle2,
  BarChart3, FileText, Download, RefreshCw,
  Bot, Users, DollarSign, Target, Brain
} from "lucide-react";
import { api, client } from "@/lib/api";
import { aiReportSummary } from "@/lib/ai-helper";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SaasReports() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { ts } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ clients: 0, projects: 0, outputs: 0, passRate: 0, revenue: 0, campaigns: 0 });
  const [activeReport, setActiveReport] = useState("overview");
  const [aiReport, setAiReport] = useState<{ summary: string; highlights: string[]; recommendations: string[]; risk_areas: string[] } | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [salesByDay, setSalesByDay] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsRes, projectsRes, outputsRes, qaRes, campRes, salesRes] = await Promise.allSettled([
        api.getClients(0, 1), api.getProjects(0, 1), api.getOutputs(0, 1),
        api.getQADashboard(), api.getCampaigns(0, 1), api.getSalesRecords(0, 200),
      ]);

      const salesItems = salesRes.status === "fulfilled" ? salesRes.value.items || [] : [];
      const salesTotal = salesItems.reduce((s, item) => s + (item.amount || 0), 0);

      // Derive daily revenue from actual sales
      const dailyRev: number[] = new Array(7).fill(0);
      const now = new Date();
      salesItems.forEach((s) => {
        if (!s.created_at) return;
        const d = new Date(s.created_at);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          dailyRev[6 - diffDays] += s.amount || 0;
        }
      });
      setSalesByDay(dailyRev);

      setStats({
        clients: clientsRes.status === "fulfilled" ? clientsRes.value.total || 0 : 0,
        projects: projectsRes.status === "fulfilled" ? projectsRes.value.total || 0 : 0,
        outputs: outputsRes.status === "fulfilled" ? outputsRes.value.total || 0 : 0,
        passRate: qaRes.status === "fulfilled" ? qaRes.value.pass_rate || 0 : 0,
        revenue: salesTotal,
        campaigns: campRes.status === "fulfilled" ? campRes.value.total || 0 : 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading reports");
      toast.error(ts("errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [ts]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleGenerateReport = async () => {
    setGeneratingAI(true);
    try {
      const metricsStr = JSON.stringify({
        clients: stats.clients, projects: stats.projects,
        outputs: stats.outputs, qaPassRate: stats.passRate,
        revenue: stats.revenue, campaigns: stats.campaigns,
      });
      const result = await aiReportSummary(metricsStr);
      if (result.ok) {
        try {
          const parsed = JSON.parse(result.text);
          setAiReport(parsed);
          await client.entities.report_items?.create?.({
            data: {
              report_type: "ai_executive_summary",
              title: "AI Executive Report",
              content: result.text,
              user_id: user?.id || "",
            },
          }).catch(() => {});
          toast.success(ts("generated"));
        } catch (err) {
          setAiReport({ summary: result.text, highlights: [], recommendations: [], risk_areas: [] });
        }
      } else {
        toast.error(result.error || ts("errorOccurred"));
      }
    } catch (err) {
      toast.error(ts("errorOccurred"));
    } finally {
      setGeneratingAI(false);
    }
  };

  const maxDailyRev = Math.max(...salesByDay, 1);

  const reportTabs = [
    { key: "overview", label: "Overview", icon: PieChart },
    { key: "revenue", label: "Revenue", icon: BarChart3 },
    { key: "ai", label: "IA Executive", icon: Bot },
  ];

  return (
    <SaasLayout title={ts("reports")} subtitle="Métricas reales desde tu base de datos">
      <DataStateWrapper loading={loading} error={error} onRetry={fetchData}>
        {/* AI Report Panel */}
        {aiReport && (
          <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">{ts("executiveSummary")} — Generado por IA</span>
            </div>
            {aiReport.summary && <p className="text-[11px] text-zinc-300 mb-3">{aiReport.summary}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiReport.highlights?.length > 0 && (
                <div>
                  <p className="text-[10px] text-emerald-400 font-semibold mb-1">Highlights</p>
                  {aiReport.highlights.map((h, i) => <p key={i} className="text-[10px] text-zinc-400">• {h}</p>)}
                </div>
              )}
              {aiReport.recommendations?.length > 0 && (
                <div>
                  <p className="text-[10px] text-blue-400 font-semibold mb-1">Recomendaciones</p>
                  {aiReport.recommendations.map((r, i) => <p key={i} className="text-[10px] text-zinc-400">• {r}</p>)}
                </div>
              )}
              {aiReport.risk_areas?.length > 0 && (
                <div>
                  <p className="text-[10px] text-amber-400 font-semibold mb-1">Áreas de Riesgo</p>
                  {aiReport.risk_areas.map((r, i) => <p key={i} className="text-[10px] text-zinc-400">• {r}</p>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI Cards — all from real backend data */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { title: "Clientes", value: stats.clients.toString(), icon: Users, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
            { title: "Proyectos", value: stats.projects.toString(), icon: Target, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
            { title: "Outputs", value: stats.outputs.toString(), icon: FileText, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
            { title: "QA Pass Rate", value: stats.passRate > 0 ? `${stats.passRate.toFixed(0)}%` : "—", icon: CheckCircle2, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
            { title: "Revenue Total", value: `€${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "from-emerald-500/10 to-teal-500/10" },
            { title: "Campañas", value: stats.campaigns.toString(), icon: Sparkles, color: "text-rose-400", bg: "from-rose-500/10 to-pink-500/10" },
          ].map(m => (
            <div key={m.title} className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center", m.bg)}>
                  <m.icon className={cn("w-4 h-4", m.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{m.value}</p>
              <p className="text-[10px] text-zinc-500">{m.title}</p>
            </div>
          ))}
        </div>

        {/* Report Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-lg bg-[#0A0E13] border border-white/[0.04] w-fit flex-wrap">
          {reportTabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveReport(tab.key)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all",
                activeReport === tab.key ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:text-zinc-300"
              )}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <Button size="sm" onClick={handleGenerateReport} disabled={generatingAI}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5 ml-2">
            {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
            Generar Reporte IA
          </Button>
          <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-8 ml-1">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>

        {activeReport === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Chart from real data */}
            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-white">Revenue Últimos 7 Días</span>
                <span className="text-xs font-bold text-emerald-400">€{salesByDay.reduce((a, b) => a + b, 0).toLocaleString()}</span>
              </div>
              {salesByDay.every(v => v === 0) ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-zinc-500">Sin ventas registradas en los últimos 7 días</p>
                </div>
              ) : (
                <div className="flex items-end gap-3 h-32">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day, i) => {
                    const val = salesByDay[i] || 0;
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[8px] text-zinc-600">€{val.toLocaleString()}</span>
                        <div className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400 hover:from-indigo-500 hover:to-violet-300 transition-all duration-300"
                          style={{ height: `${(val / maxDailyRev) * 100}px`, minHeight: 4 }} />
                        <span className="text-[9px] text-zinc-600">{day}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
              <span className="text-xs font-semibold text-white mb-4 block">Resumen del Negocio</span>
              <div className="space-y-3">
                {[
                  { label: "Clientes registrados", value: stats.clients },
                  { label: "Proyectos activos", value: stats.projects },
                  { label: "Outputs generados", value: stats.outputs },
                  { label: "Campañas creadas", value: stats.campaigns },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-xs text-zinc-400">{item.label}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                ))}
                {stats.passRate > 0 && (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">QA Pass Rate</span>
                      <span className="text-sm font-bold text-emerald-400">{stats.passRate.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                        style={{ width: `${stats.passRate}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeReport === "revenue" && (
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
            <span className="text-xs font-semibold text-white mb-4 block">Detalle de Revenue</span>
            {stats.revenue === 0 ? (
              <div className="text-center py-10">
                <DollarSign className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Sin ventas registradas aún. Crea ventas desde el módulo de Pagos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                    <p className="text-xl font-bold text-emerald-400">€{stats.revenue.toLocaleString()}</p>
                    <p className="text-[9px] text-zinc-500">Revenue Total</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                    <p className="text-xl font-bold text-white">€{salesByDay.reduce((a, b) => a + b, 0).toLocaleString()}</p>
                    <p className="text-[9px] text-zinc-500">Últimos 7 Días</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                    <p className="text-xl font-bold text-white">{stats.clients > 0 ? `€${Math.round(stats.revenue / stats.clients).toLocaleString()}` : "—"}</p>
                    <p className="text-[9px] text-zinc-500">Revenue por Cliente</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeReport === "ai" && (
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">Reporte Ejecutivo IA</span>
            </div>
            {aiReport ? (
              <div className="space-y-4">
                {aiReport.summary && <p className="text-sm text-zinc-300 leading-relaxed">{aiReport.summary}</p>}
                {aiReport.highlights?.length > 0 && (
                  <div>
                    <p className="text-xs text-emerald-400 font-semibold mb-2">Highlights</p>
                    {aiReport.highlights.map((h, i) => <p key={i} className="text-xs text-zinc-400 mb-1">• {h}</p>)}
                  </div>
                )}
                {aiReport.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-400 font-semibold mb-2">Recomendaciones</p>
                    {aiReport.recommendations.map((r, i) => <p key={i} className="text-xs text-zinc-400 mb-1">• {r}</p>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                <Bot className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-xs text-zinc-500 mb-3">Haz clic en "Generar Reporte IA" para crear un análisis ejecutivo basado en tus datos reales.</p>
                <Button size="sm" onClick={handleGenerateReport} disabled={generatingAI}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
                  {generatingAI ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Brain className="w-3 h-3 mr-1" />}
                  Generar Reporte
                </Button>
              </div>
            )}
          </div>
        )}
      </DataStateWrapper>
    </SaasLayout>
  );
}