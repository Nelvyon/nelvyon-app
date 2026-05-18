import { useCallback, useEffect, useState, type ElementType } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import SaasLayout from "@/components/SaasLayout";
import { api, getApiErrorMessage, type WorkspaceHomeSummaryResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users, Megaphone, Target, Headphones, CheckCircle2, Circle,
  ArrowRight, LayoutDashboard, Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function SaasWorkspaceHome() {
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const navigate = useNavigate();
  const [data, setData] = useState<WorkspaceHomeSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!activeWorkspace) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getWorkspaceHomeSummary();
      setData(res);
    } catch (e) {
      setData(null);
      toast.error(getApiErrorMessage(e, "No se pudo cargar el resumen del workspace."));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (!authLoading && user && !wsLoading) void load();
  }, [authLoading, user, wsLoading, load]);

  if (authLoading || wsLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <SaasLayout title="Inicio" subtitle="Selecciona un workspace">
        <div className="max-w-md mx-auto rounded-2xl border border-white/[0.06] bg-[#0A0A0D] p-8 text-center space-y-4">
          <p className="text-sm text-zinc-400">Necesitas un workspace activo para ver tu inicio.</p>
          <Button asChild className="rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12]">
            <Link to="/saas/onboarding">Ir a onboarding</Link>
          </Button>
        </div>
      </SaasLayout>
    );
  }

  const c = data?.counts;
  const steps = data?.first_steps ?? [];

  return (
    <SaasLayout
      title="Inicio"
      subtitle={data?.workspace_name ? `${data.workspace_name} · resumen del workspace` : "Resumen del workspace"}
    >
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0c0c10] via-[#09090b] to-[#0a0f14] px-6 py-10 sm:px-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-violet-500/[0.06] blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium mb-2">NELVYON · Workspace</p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                {loading ? "Cargando…" : (data?.workspace_name ?? "Tu espacio")}
              </h1>
              <p className="mt-2 text-sm text-zinc-400 max-w-xl leading-relaxed">
                Vista limpia de lo esencial. Sin métricas de relleno: solo lo que ya tienes en este workspace.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 rounded-xl border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              asChild
            >
              <Link to="/saas/dashboard" className="inline-flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 opacity-70" />
                Vista detallada
                <ArrowRight className="w-3.5 h-3.5 opacity-50" />
              </Link>
            </Button>
          </div>
        </section>

        {/* KPIs */}
        <section aria-label="Indicadores clave">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-4">Indicadores</h2>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard icon={Users} label="Contactos" value={c?.contacts ?? 0} hint="CRM" linkTo="/saas/crm" linkLabel="Abrir lista" linkTestId="home-kpi-contacts-link" />
              <KpiCard icon={Target} label="Deals abiertos" value={c?.deals_open ?? 0} hint="Pipeline activo" />
              <KpiCard icon={Megaphone} label="Campañas" value={c?.campaigns ?? 0} hint="Email" linkTo="/saas/campaigns" linkLabel="Ver campañas" linkTestId="home-kpi-campaigns-link" />
              <KpiCard icon={Headphones} label="Tickets abiertos" value={c?.helpdesk_open ?? 0} hint="Helpdesk" linkTo="/saas/helpdesk" linkLabel="Ver tickets" linkTestId="home-kpi-helpdesk-link" />
            </div>
          )}
        </section>

        {/* Primeros pasos */}
        <section aria-label="Primeros pasos">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400/80" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Primeros pasos</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {steps.map((step) => (
                <li key={step.id}>
                  <Link
                    to={step.href}
                    className={cn(
                      "group flex items-start gap-4 rounded-xl border px-4 py-4 transition-colors",
                      step.done
                        ? "border-emerald-500/15 bg-emerald-500/[0.04]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400/90" aria-hidden />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{step.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{step.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SaasLayout>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  linkTo,
  linkLabel,
  linkTestId,
}: {
  icon: ElementType;
  label: string;
  value: number;
  hint: string;
  linkTo?: string;
  linkLabel?: string;
  linkTestId?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <Icon className="w-4 h-4 text-zinc-500" aria-hidden />
        <span className="text-[10px] uppercase tracking-wide text-zinc-600">{hint}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-semibold text-white tabular-nums">{value}</p>
      <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          data-testid={linkTestId || "home-kpi-link"}
          className="mt-3 inline-flex text-[11px] font-medium text-blue-400/90 hover:text-blue-300 transition-colors"
        >
          {linkLabel} →
        </Link>
      )}
    </>
  );

  if (linkTo) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0D] px-4 py-5 sm:px-5 transition-colors hover:border-white/[0.1]">
        {inner}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0D] px-4 py-5 sm:px-5">
      {inner}
    </div>
  );
}
