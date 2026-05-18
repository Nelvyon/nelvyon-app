import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  User, Building2, UserPlus, Target, Megaphone, Users,
  Plug, BarChart3, CheckCircle2, Sparkles, Loader2, Rocket, PartyPopper, RefreshCw,
  Database, ArrowRight, Play, Zap, Building,
} from "lucide-react";

const STEP_ICONS: Record<string, React.ElementType> = {
  user: User, building: Building2, "user-plus": UserPlus,
  target: Target, megaphone: Megaphone, users: Users,
  plug: Plug, "bar-chart": BarChart3,
};

const STEP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  setup: { bg: "from-violet-500/10 to-purple-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  activation: { bg: "from-emerald-500/10 to-green-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  team: { bg: "from-blue-500/10 to-cyan-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  integrations: { bg: "from-amber-500/10 to-orange-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  explore: { bg: "from-rose-500/10 to-pink-500/10", text: "text-rose-400", border: "border-rose-500/20" },
};

const STEP_ROUTES: Record<string, string> = {
  profile: "/saas/settings",
  workspace: "/saas/tenant-settings",
  first_contact: "/saas/crm",
  first_deal: "/saas/pipelines",
  first_campaign: "/saas/campaigns",
  invite_team: "/saas/settings",
  connect_integration: "/saas/integrations",
  explore_dashboard: "/saas/home",
};

/** Copia de `backend/routers/onboarding.py` ONBOARDING_STEPS — último recurso si fallan API y /steps. */
const STATIC_ONBOARDING_STEP_DEFS = [
  { key: "profile", title: "Configura tu perfil", description: "Añade tu nombre, foto y datos de contacto", icon: "user", order: 1, category: "setup" },
  { key: "workspace", title: "Configura tu workspace", description: "Nombre de empresa, logo, zona horaria e idioma", icon: "building", order: 2, category: "setup" },
  { key: "first_contact", title: "Crea tu primer contacto", description: "Añade un contacto al CRM para empezar", icon: "user-plus", order: 3, category: "activation" },
  { key: "first_deal", title: "Crea tu primer deal", description: "Abre un deal en el pipeline para trackear oportunidades", icon: "target", order: 4, category: "activation" },
  { key: "first_campaign", title: "Lanza tu primera campaña", description: "Crea una campaña de email o social media", icon: "megaphone", order: 5, category: "activation" },
  { key: "invite_team", title: "Invita a tu equipo", description: "Añade miembros a tu workspace para colaborar", icon: "users", order: 6, category: "team" },
  { key: "connect_integration", title: "Conecta una integración", description: "Conecta Stripe, Google, Meta u otra herramienta", icon: "plug", order: 7, category: "integrations" },
  { key: "explore_dashboard", title: "Explora el inicio", description: "Revisa el resumen del workspace y, si quieres, las métricas detalladas", icon: "bar-chart", order: 8, category: "explore" },
] as const;

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  category: string;
  completed: boolean;
  completed_at: string | null;
}

interface OnboardingProgress {
  workspace_id: number;
  user_id: string;
  steps: OnboardingStep[];
  completed_count: number;
  total_count: number;
  progress_percent: number;
  is_complete: boolean;
}

function buildEmptyProgress(
  defs: ReadonlyArray<{
    key: string;
    title: string;
    description: string;
    icon: string;
    order: number;
    category: string;
  }>,
  workspaceId: number,
  userId: string,
): OnboardingProgress {
  const steps: OnboardingStep[] = defs.map((d) => ({
    ...d,
    completed: false,
    completed_at: null,
  }));
  const total = steps.length;
  return {
    workspace_id: workspaceId,
    user_id: userId,
    steps,
    completed_count: 0,
    total_count: total,
    progress_percent: 0,
    is_complete: false,
  };
}

export default function SaasOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const {
    activeWorkspace,
    loading: workspaceLoading,
    createWorkspace,
    error: workspaceError,
    refreshWorkspaces,
  } = useWorkspace();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchProgress = useCallback(async () => {
    if (!user?.id || !activeWorkspace) return;
    setLoading(true);
    setOfflineFallback(false);
    try {
      const data = await api.getOnboardingProgress();
      setProgress(data);
    } catch {
      try {
        const { steps: raw } = await api.getOnboardingSteps();
        const defs = raw?.length ? raw : STATIC_ONBOARDING_STEP_DEFS;
        setProgress(buildEmptyProgress(defs, activeWorkspace.id, user.id));
        setOfflineFallback(true);
        toast.message("Progreso no disponible; mostrando checklist local. Completar pasos se sincronizará al recuperar el servidor.");
      } catch {
        setProgress(buildEmptyProgress(STATIC_ONBOARDING_STEP_DEFS, activeWorkspace.id, user.id));
        setOfflineFallback(true);
        toast.error("No se pudo cargar el progreso; checklist en modo local.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace]);

  useEffect(() => {
    if (activeWorkspace) fetchProgress();
    else {
      setProgress(null);
      setLoading(false);
    }
  }, [fetchProgress, activeWorkspace]);

  const completeStep = async (stepKey: string) => {
    if (!activeWorkspace) return;
    setCompleting(stepKey);
    try {
      await api.completeOnboardingStep(stepKey);
      toast.success("¡Paso completado!");
      await fetchProgress();
    } catch {
      toast.error("Error al completar el paso");
    } finally {
      setCompleting(null);
    }
  };

  const seedDemoData = async () => {
    if (!activeWorkspace) return;
    setSeeding(true);
    try {
      const data = await api.seedOnboardingDemo(["contacts", "deals", "campaigns"]);
      toast.success(`Datos demo: ${JSON.stringify(data.seeded ?? {})}`);
      await fetchProgress();
    } catch {
      toast.error("Error al crear datos demo");
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) {
      toast.error("Elige un nombre para tu espacio de trabajo");
      return;
    }
    setCreatingWs(true);
    try {
      const ws = await createWorkspace(name);
      if (ws) {
        toast.success("Workspace creado");
        setNewWorkspaceName("");
        await refreshWorkspaces();
      }
    } finally {
      setCreatingWs(false);
    }
  };

  if (authLoading || (user && workspaceLoading)) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500/60 animate-spin" />
      </div>
    );
  }

  if (user && !activeWorkspace && !workspaceLoading) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0A0E13] p-8 space-y-6">
          <div className="text-center space-y-2">
            <Building className="w-12 h-12 text-violet-400 mx-auto" />
            <h1 className="text-xl font-bold text-white">Crea tu espacio de trabajo</h1>
            <p className="text-sm text-zinc-400">
              NELVYON aísla datos por workspace. Crea uno para continuar con el onboarding y el CRM.
            </p>
          </div>
          {workspaceError && (
            <p className="text-xs text-amber-400 text-center">{workspaceError}</p>
          )}
          <div className="space-y-3">
            <Input
              placeholder="Nombre del workspace (ej. Mi agencia)"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              className="bg-[#0F1419] border-white/[0.08] text-white"
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
            />
            <Button
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white"
              disabled={creatingWs}
              onClick={handleCreateWorkspace}
            >
              {creatingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear workspace"}
            </Button>
          </div>
          <Button variant="ghost" className="w-full text-zinc-500" onClick={() => navigate("/saas/home")}>
            Ir al inicio (limitado sin workspace)
          </Button>
        </div>
      </div>
    );
  }

  const steps = progress?.steps || [];
  const completedCount = progress?.completed_count || 0;
  const totalCount = progress?.total_count || 8;
  const progressPct = progress?.progress_percent || 0;
  const isComplete = progress?.is_complete || false;

  return (
    <SaasLayout title="Onboarding" subtitle="Configura tu plataforma paso a paso">
      <div className="max-w-4xl mx-auto space-y-6">
        {offlineFallback && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-100/90">
            Checklist en modo resiliencia: el servidor no devolvió el progreso guardado; los pasos siguen siendo los oficiales.
          </div>
        )}

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-blue-600/10 to-emerald-600/20 border border-violet-500/20 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isComplete ? "¡Onboarding Completado!" : "Bienvenido a NELVYON"}
                </h1>
                <p className="text-sm text-zinc-400">
                  {isComplete
                    ? "Tu plataforma está lista para producción"
                    : "Sigue estos pasos para configurar tu plataforma"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    Progreso: {completedCount}/{totalCount} pasos
                  </span>
                  <span className="text-xs font-bold text-violet-400">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2.5 bg-white/[0.06]" />
              </div>
              {isComplete && (
                <PartyPopper className="w-8 h-8 text-amber-400 animate-bounce" />
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={seedDemoData}
            disabled={seeding || !activeWorkspace}
            className="border-violet-500/20 text-violet-400 hover:bg-violet-500/10"
          >
            {seeding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Database className="w-3.5 h-3.5 mr-1.5" />}
            Cargar datos demo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchProgress()}
            className="border-white/10 text-zinc-400 hover:bg-white/5"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/saas/home")}
            className="bg-gradient-to-r from-violet-600 to-blue-600 text-white ml-auto"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Ir al inicio
          </Button>
        </div>

        {/* Steps Grid — nunca vacío: fetchProgress siempre rellena desde API, /steps o STATIC */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl p-5 bg-[#0F1419] border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.04]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                    <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : steps.length === 0 ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-zinc-300">
            Estado inesperado sin pasos. Pulsa <strong>Actualizar</strong> o recarga la página.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((step) => {
              const Icon = STEP_ICONS[step.icon] || Sparkles;
              const colors = STEP_COLORS[step.category] || STEP_COLORS.setup;
              const route = STEP_ROUTES[step.key];
              const isCompleting = completing === step.key;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "rounded-xl p-5 border transition-all",
                    step.completed
                      ? "bg-emerald-500/[0.03] border-emerald-500/20"
                      : "bg-[#0A0E13] border-white/[0.06] hover:border-white/[0.12]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      step.completed
                        ? "bg-emerald-500/10"
                        : `bg-gradient-to-br ${colors.bg}`
                    )}>
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Icon className={cn("w-5 h-5", colors.text)} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "text-sm font-semibold",
                          step.completed ? "text-emerald-400" : "text-white"
                        )}>
                          {step.title}
                        </h3>
                        <span className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase",
                          colors.border, colors.text, "border bg-transparent"
                        )}>
                          {step.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-3">{step.description}</p>

                      {step.completed ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-medium">
                            Completado
                            {step.completed_at && ` · ${new Date(step.completed_at).toLocaleDateString("es")}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {route && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(route)}
                              className="h-7 text-[10px] border-white/10 text-zinc-300 hover:bg-white/5"
                            >
                              <Play className="w-3 h-3 mr-1" /> Ir al módulo
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => completeStep(step.key)}
                            disabled={isCompleting}
                            className="h-7 text-[10px] bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20"
                          >
                            {isCompleting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar completado
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isComplete && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600/10 to-green-600/10 border border-emerald-500/20 p-8 text-center">
            <PartyPopper className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">¡Tu plataforma está lista!</h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
              Has completado todos los pasos de onboarding. Tu NELVYON está configurado y listo para producción.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/saas/global-dashboard")} className="bg-gradient-to-r from-violet-600 to-blue-600 text-white">
                <BarChart3 className="w-4 h-4 mr-2" /> Resumen ejecutivo
              </Button>
              <Button variant="outline" onClick={() => navigate("/saas/home")} className="border-white/10 text-zinc-300">
                Dashboard SaaS <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </SaasLayout>
  );
}
