import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Server, Globe, CheckCircle2, Clock, AlertTriangle,
  Loader2, ExternalLink, Eye, RefreshCw, FolderKanban,
  Hammer, AlertCircle
} from "lucide-react";
import { api, type NelvyonProject, type NelvyonOutput } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HostingAgent() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [outputs, setOutputs] = useState<NelvyonOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<NelvyonProject | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, outRes] = await Promise.allSettled([
        api.getProjects(0, 100),
        api.getOutputs(0, 100),
      ]);
      if (projRes.status === "fulfilled") {
        const items = projRes.value.items || [];
        setProjects(items);
        if (items.length > 0 && !selectedProject) setSelectedProject(items[0]);
      }
      if (outRes.status === "fulfilled") setOutputs(outRes.value.items || []);
    } catch (err) {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const projectOutputs = selectedProject
    ? outputs.filter(o => o.project_id === selectedProject.id)
    : [];

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    approved: { label: "Aprobado", color: "text-emerald-400", icon: CheckCircle2 },
    passed: { label: "Aprobado", color: "text-emerald-400", icon: CheckCircle2 },
    delivered: { label: "Entregado", color: "text-emerald-400", icon: CheckCircle2 },
    generating: { label: "Generando", color: "text-blue-400", icon: Loader2 },
    qa_review: { label: "En QA", color: "text-amber-400", icon: Clock },
    pending: { label: "Pendiente", color: "text-zinc-400", icon: Clock },
    draft: { label: "Borrador", color: "text-zinc-400", icon: Clock },
    failed: { label: "Fallido", color: "text-red-400", icon: AlertTriangle },
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Hosting & Deploy" subtitle="Gestión de despliegues">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Cargando proyectos...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Hosting & Deploy" subtitle="Gestión de despliegues">
      {/* Honest Status Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 mb-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Módulo en Desarrollo</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              El deploy automático de webs no está implementado aún. Este panel muestra tus proyectos y outputs reales del backend.
              El despliegue real requiere integración con un servicio de hosting (Vercel, Netlify, etc.) que está pendiente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold text-white">Proyectos ({projects.length})</h2>
            </div>
            <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-white/[0.05]">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-[#12131A] p-8 text-center">
              <FolderKanban className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Sin proyectos</p>
              <p className="text-xs text-zinc-600 mt-1">Crea un proyecto desde el CRM o el Generador</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/projects")}>
                Ir a Proyectos
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {projects.map(project => {
                const isSelected = selectedProject?.id === project.id;
                const st = statusConfig[project.status || "draft"] || statusConfig.draft;
                const StIcon = st.icon;
                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all",
                      isSelected
                        ? "border-violet-500/30 bg-violet-500/[0.05]"
                        : "border-white/[0.06] bg-[#12131A] hover:border-white/[0.1]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white truncate">{project.name}</span>
                      <div className="flex items-center gap-1">
                        <StIcon className={cn("w-3 h-3", st.color)} />
                        <span className={cn("text-[9px] font-medium", st.color)}>{st.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${project.progress || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-600">{project.progress || 0}%</span>
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-1 capitalize">{project.project_type || "—"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Project Detail & Outputs */}
        <div className="lg:col-span-8">
          {selectedProject ? (
            <>
              {/* Project Header */}
              <div className="rounded-xl border border-white/[0.06] bg-[#12131A] p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">{selectedProject.name}</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5 capitalize">
                      {selectedProject.project_type || "—"} · Progreso: {selectedProject.progress || 0}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate("/generator")} className="text-xs">
                      <Hammer className="w-3 h-3 mr-1" /> Generar Output
                    </Button>
                  </div>
                </div>
                {selectedProject.brief && (
                  <p className="text-xs text-zinc-400 mt-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    {selectedProject.brief}
                  </p>
                )}
              </div>

              {/* Outputs for this project */}
              <div className="flex items-center gap-2 mb-3">
                <Hammer className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-semibold text-white">Outputs del Proyecto ({projectOutputs.length})</h3>
              </div>

              {projectOutputs.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-[#12131A] p-8 text-center">
                  <Hammer className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Sin outputs para este proyecto</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Genera contenido desde el Generador</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectOutputs.map(output => {
                    const st = statusConfig[output.qa_status || "pending"] || statusConfig.pending;
                    const StIcon = st.icon;
                    return (
                      <div key={output.id} className="rounded-xl border border-white/[0.06] bg-[#12131A] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-white">{output.title || `Output #${output.id}`}</span>
                          <div className="flex items-center gap-2">
                            {output.qa_score !== undefined && output.qa_score !== null && (
                              <span className="text-[10px] text-zinc-500">Score: {output.qa_score}</span>
                            )}
                            <div className="flex items-center gap-1">
                              <StIcon className={cn("w-3 h-3", st.color)} />
                              <span className={cn("text-[9px] font-medium", st.color)}>{st.label}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 capitalize">{output.output_type || "—"}</p>
                        {output.content && (
                          <p className="text-[10px] text-zinc-600 mt-2 line-clamp-2">{output.content.substring(0, 200)}...</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Deploy Status — Honest */}
              <div className="mt-4 rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-400">Estado de Deploy</span>
                </div>
                <p className="text-[10px] text-zinc-600">
                  El deploy automático no está disponible en esta versión. Para desplegar tu web, exporta los outputs generados
                  y súbelos manualmente a tu servicio de hosting preferido (Vercel, Netlify, Hostinger, etc.).
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-[#12131A] p-12 text-center">
              <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Selecciona un proyecto</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}