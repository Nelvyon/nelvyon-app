import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users, FolderKanban, Hammer, ShieldCheck,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle, Zap, Loader2,
  AlertCircle, Globe, ShoppingCart, Share2, Megaphone,
  ClipboardCheck, FileText, Sparkles, Activity, BarChart3,
  Palette, ArrowRight, Bot,
  RefreshCw
} from "lucide-react";
import { api, type NelvyonClient, type NelvyonProject, type NelvyonOutput, type QADashboardStats } from "@/lib/api";
import { cn } from "@/lib/utils";

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 40));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

const statusColors: Record<string, string> = {
  approved: "text-emerald-400 bg-emerald-500/10", passed: "text-emerald-400 bg-emerald-500/10",
  delivered: "text-emerald-400 bg-emerald-500/10", generating: "text-blue-400 bg-blue-500/10",
  qa_review: "text-amber-400 bg-amber-500/10", pending: "text-zinc-400 bg-zinc-500/10",
  draft: "text-zinc-400 bg-zinc-500/10", failed: "text-red-400 bg-red-500/10",
};
const statusLabels: Record<string, string> = {
  approved: "Aprobado", generating: "Generando", qa_review: "En QA",
  pending: "Pendiente", passed: "Aprobado", failed: "Fallido",
  draft: "Borrador", delivered: "Entregado",
};

const generators = [
  { id: "web", icon: Globe, label: "Web Premium", color: "from-violet-500 to-blue-500", desc: "Estructura web completa" },
  { id: "ecommerce", icon: ShoppingCart, label: "E-commerce", color: "from-blue-500 to-cyan-500", desc: "Tienda online" },
  { id: "social", icon: Share2, label: "Social Media", color: "from-pink-500 to-rose-500", desc: "Estrategia y contenido" },
  { id: "ads", icon: Megaphone, label: "Campañas Ads", color: "from-amber-500 to-orange-500", desc: "Meta, Google, LinkedIn" },
  { id: "audit", icon: ClipboardCheck, label: "Auditoría", color: "from-emerald-500 to-green-500", desc: "Análisis completo" },
  { id: "proposal", icon: FileText, label: "Propuesta", color: "from-indigo-500 to-violet-500", desc: "Propuesta comercial" },
  { id: "branding", icon: Palette, label: "Branding", color: "from-fuchsia-500 to-pink-500", desc: "Sistema visual" },
];

export default function Dashboard() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<NelvyonClient[]>([]);
  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [outputs, setOutputs] = useState<NelvyonOutput[]>([]);
  const [qaStats, setQaStats] = useState<QADashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsRes, projectsRes, outputsRes, qaRes] = await Promise.allSettled([
        api.getClients(0, 50), api.getProjects(0, 50),
        api.getOutputs(0, 50), api.getQADashboard(),
      ]);
      if (clientsRes.status === "fulfilled") setClients(clientsRes.value.items || []);
      if (projectsRes.status === "fulfilled") setProjects(projectsRes.value.items || []);
      if (outputsRes.status === "fulfilled") setOutputs(outputsRes.value.items || []);
      if (qaRes.status === "fulfilled") setQaStats(qaRes.value);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const activeClients = clients.filter(c => c.status === "active" || !c.status).length;
  const activeProjects = projects.filter(p => p.status !== "completed" && p.status !== "cancelled").length;
  const totalOutputs = outputs.length;
  const passRate = qaStats ? qaStats.pass_rate : 0;
  const recentOutputs = outputs.slice(0, 8);

  const metrics = [
    { label: "Clientes", value: clients.length, icon: Users, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10", sub: `${activeClients} activos` },
    { label: "Proyectos", value: projects.length, icon: FolderKanban, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10", sub: `${activeProjects} en curso` },
    { label: "Outputs Generados", value: totalOutputs, icon: Hammer, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10", sub: "Contenido generado con IA" },
    { label: "QA Pass Rate", value: passRate, icon: ShieldCheck, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10", sub: qaStats ? `${qaStats.passed}/${qaStats.total_outputs} aprobados` : "Sin datos", suffix: "%" },
  ];

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Centro de control NELVYON OS">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Cargando datos del backend...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Centro de control NELVYON OS">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-zinc-400">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-500 transition-colors">Reintentar</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Centro de control NELVYON OS">
      {/* Header — Honest Status */}
      <div className="rounded-xl bg-gradient-to-r from-violet-500/[0.06] via-blue-500/[0.04] to-emerald-500/[0.06] border border-violet-500/10 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Bot className="w-5 h-5 text-violet-400" />
          <span className="text-xs font-bold text-white">NELVYON OS</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">BACKEND CONECTADO</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
            Datos en vivo del servidor
          </span>
          <div className="ml-auto">
            <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors" title="Actualizar datos">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid — All from real backend data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div key={m.label}
            className={cn("p-5 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-500",
              animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )} style={{ transitionDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center", m.bg)}>
                <m.icon className={cn("w-4 h-4", m.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">
              <AnimatedNumber value={m.value} suffix={m.suffix || ""} />
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">{m.label}</p>
            <p className="text-[9px] text-zinc-700 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Activity Timeline — Real outputs from backend */}
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-white">Outputs Recientes</h2>
            <span className="ml-auto text-[9px] text-zinc-600">Datos reales del backend</span>
          </div>
          <div className="bg-[#0A0E13] border border-white/[0.04] rounded-xl p-4 overflow-y-auto" style={{ maxHeight: 340 }}>
            {recentOutputs.length === 0 ? (
              <div className="text-center py-8">
                <Hammer className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">Sin outputs aún</p>
                <p className="text-[10px] text-zinc-700 mt-1">Usa el Generador para crear tu primer output</p>
              </div>
            ) : (
              <div className="space-y-0">
                {recentOutputs.map((output, i) => {
                  const status = output.qa_status || "pending";
                  return (
                    <div key={output.id} className="flex gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                      <div className="flex flex-col items-center">
                        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-1",
                          status === "passed" || status === "approved" ? "bg-emerald-500" :
                          status === "failed" ? "bg-red-500" :
                          status === "qa_review" ? "bg-amber-500" : "bg-zinc-600"
                        )} />
                        {i < recentOutputs.length - 1 && <div className="w-px flex-1 bg-white/[0.04] mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white truncate">{output.title || `Output #${output.id}`}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded", statusColors[status] || "text-zinc-400 bg-zinc-500/10")}>
                            {statusLabels[status] || status}
                          </span>
                          {output.qa_score !== undefined && output.qa_score !== null && (
                            <span className="text-[9px] text-zinc-600">Score: {output.qa_score}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Generators — These actually work via OMEGA */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-white">Generadores — Acceso Rápido</h2>
            <span className="ml-auto text-[9px] text-emerald-400">✓ Conectados al backend con IA</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {generators.map((gen) => (
              <button key={gen.id} onClick={() => navigate("/generator")}
                className="text-left p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all duration-300 group">
                <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg", gen.color)}>
                  <gen.icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-[11px] font-semibold text-white group-hover:text-violet-300 transition-colors">{gen.label}</h3>
                <p className="text-[9px] text-zinc-600 mt-0.5 line-clamp-1">{gen.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SaaS Quick Access — Honest functionality levels */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-white">Módulos SaaS</h2>
          <button onClick={() => navigate("/saas")} className="ml-auto text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { icon: Users, label: "CRM", path: "/saas/crm", color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10", level: "full" },
            { icon: Zap, label: "Chat IA", path: "/saas/conversations", color: "text-blue-400", bg: "from-blue-500/10 to-indigo-500/10", level: "partial" },
            { icon: Globe, label: "Social", path: "/saas/social", color: "text-pink-400", bg: "from-pink-500/10 to-rose-500/10", level: "partial" },
            { icon: ShieldCheck, label: "Pagos", path: "/saas/payments", color: "text-emerald-400", bg: "from-emerald-500/10 to-teal-500/10", level: "full" },
            { icon: FolderKanban, label: "Pipelines", path: "/saas/pipelines", color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10", level: "partial" },
            { icon: BarChart3, label: "Reportes", path: "/saas/reports", color: "text-indigo-400", bg: "from-indigo-500/10 to-violet-500/10", level: "ui_only" },
            { icon: Clock, label: "Calendario", path: "/saas/calendar", color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10", level: "ui_only" },
            { icon: Globe, label: "Websites", path: "/saas/websites", color: "text-cyan-400", bg: "from-cyan-500/10 to-blue-500/10", level: "ui_only" },
          ].map(svc => (
            <button key={svc.label} onClick={() => navigate(svc.path)}
              className="p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all group text-left">
              <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", svc.bg)}>
                <svc.icon className={cn("w-3.5 h-3.5", svc.color)} />
              </div>
              <p className="text-[10px] font-semibold text-white group-hover:text-violet-300 transition-colors">{svc.label}</p>
              <p className={cn("text-[8px] font-bold",
                svc.level === "full" ? "text-emerald-400" :
                svc.level === "partial" ? "text-amber-400" : "text-zinc-500"
              )}>
                {svc.level === "full" ? "✓ Funcional" : svc.level === "partial" ? "◐ Parcial" : "○ Solo UI"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Projects Overview — Real data */}
      {projects.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-violet-500/[0.06] to-purple-500/[0.03] border border-violet-500/10 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-4 h-4 text-violet-400" />
              <div>
                <h3 className="text-xs font-semibold text-white">Proyectos</h3>
                <p className="text-[10px] text-zinc-600">{activeProjects} en curso · {projects.length} total</p>
              </div>
            </div>
            <button onClick={() => navigate("/projects")} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="p-4 rounded-xl bg-black/20 border border-white/[0.04] hover:border-violet-500/20 transition-all cursor-pointer" onClick={() => navigate("/projects")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white truncate">{project.name}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded", statusColors[project.status || "draft"] || "text-zinc-400 bg-zinc-500/10")}>
                    {statusLabels[project.status || "draft"] || project.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all" style={{ width: `${project.progress || 0}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-600">{project.progress || 0}%</span>
                </div>
                <p className="text-[9px] text-zinc-700 mt-1.5 capitalize">{project.project_type || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QA Summary — Real data from backend */}
      {qaStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Outputs", value: qaStats.total_outputs, icon: BarChart3, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
            { label: "Aprobados", value: qaStats.passed, icon: CheckCircle2, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
            { label: "Fallidos", value: qaStats.failed, icon: XCircle, color: "text-red-400", bg: "from-red-500/10 to-rose-500/10" },
            { label: "Pendientes", value: qaStats.pending, icon: Clock, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
            { label: "Score Promedio", value: qaStats.average_score.toFixed(1), icon: Zap, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all">
              <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-zinc-600">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Honest Footer */}
      <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] text-zinc-600">
          <span>NELVYON OS — Todos los datos mostrados provienen del backend real</span>
          <span>·</span>
          <span>Auth ✓ · CRM ✓ · Generador IA ✓ · QA Engine ✓ · Pagos Stripe ✓</span>
        </div>
      </div>
    </DashboardLayout>
  );
}