"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Rocket } from "lucide-react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { useOnboardingProgress } from "@/features/onboarding/hooks";
import { useAuth } from "@/core/auth/AuthContext";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import type { EliteSectorGroup } from "@/lib/eliteTemplates/types";

export type LaunchpadPhase = "day1" | "week1" | "month1";

export type LaunchpadStep = {
  id: string;
  phase: LaunchpadPhase;
  title: string;
  description: string;
  href: string;
  cta: string;
  onboardingKey?: string;
};

const LAUNCHPAD_STEPS: LaunchpadStep[] = [
  {
    id: "pack",
    phase: "day1",
    title: "Activar Growth Pack",
    description: "Local, Ecommerce o SaaS B2B — landing, SEO y chatbot en un clic.",
    href: "/packs",
    cta: "Elegir pack",
  },
  {
    id: "ads",
    phase: "day1",
    title: "Lanzar primera campaña Ads",
    description: "Plantilla élite por sector con briefing y preview OS.",
    href: "/publicidad",
    cta: "Ir a Publicidad",
  },
  {
    id: "funnel",
    phase: "day1",
    title: "Publicar embudo Ads → CRM",
    description: "Embudo completo desde anuncio hasta pipeline.",
    href: "/funnels",
    cta: "Ir a Embudos",
  },
  {
    id: "crm",
    phase: "week1",
    title: "Pipeline CRM activo",
    description: "Contactos, oportunidades y primer deal en curso.",
    href: "/crm",
    cta: "Abrir Revenue",
    onboardingKey: "crm_bootstrap",
  },
  {
    id: "email",
    phase: "week1",
    title: "Secuencia Email / Nurture",
    description: "Bienvenida, carrito abandonado o nurture B2B en 1 clic.",
    href: "/campaigns",
    cta: "Ir a Campañas",
  },
  {
    id: "automation",
    phase: "week1",
    title: "Primera automatización",
    description: "Workflow que conecta lead → nurture → alerta equipo.",
    href: "/automatizacion",
    cta: "Automatizar",
    onboardingKey: "automation_bootstrap",
  },
  {
    id: "inbox",
    phase: "week1",
    title: "Bandeja unificada",
    description: "Conversaciones y helpdesk en un solo lugar.",
    href: "/dashboard/inbox",
    cta: "Abrir bandeja",
  },
  {
    id: "ceo",
    phase: "month1",
    title: "Dashboard CEO del pack",
    description: "Revenue, pipeline, ROAS y entregables del sector.",
    href: "/dashboard/local-growth",
    cta: "Ver informe",
  },
  {
    id: "analytics",
    phase: "month1",
    title: "Analytics ejecutivos",
    description: "Benchmarks y reportes para decisiones de crecimiento.",
    href: "/dashboard/executive-reports",
    cta: "Ver analytics",
  },
  {
    id: "optimize",
    phase: "month1",
    title: "Optimizar Ads + Funnel + Email",
    description: "Iterar plantillas élite con datos reales del workspace.",
    href: "/os/packs",
    cta: "Revisar packs",
  },
];

const PHASE_LABELS: Record<LaunchpadPhase, string> = {
  day1: "Día 1 — Lanzar",
  week1: "Semana 1 — Conectar",
  month1: "Mes 1 — Escalar",
};

const PACK_CEO_HREFS: Record<EliteSectorGroup, string> = {
  local: "/dashboard/local-growth",
  ecommerce: "/dashboard/ecommerce-growth",
  saas_b2b: "/dashboard/saas-b2b-growth",
};

function stepsForPhase(phase: LaunchpadPhase, ceoHref: string): LaunchpadStep[] {
  return LAUNCHPAD_STEPS.filter((s) => s.phase === phase).map((s) =>
    s.id === "ceo" ? { ...s, href: ceoHref } : s,
  );
}

export function NelvyonLaunchpad({ preferredPack }: { preferredPack?: EliteSectorGroup }) {
  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const { workspaceId } = useWorkspace();
  const progress = useOnboardingProgress(Boolean(user && workspaceId && !isBootstrapping));

  const completedKeys = new Set(
    (progress.data?.steps ?? []).filter((s) => s.completed).map((s) => s.key),
  );

  const ceoHref = preferredPack ? PACK_CEO_HREFS[preferredPack] : "/dashboard/local-growth";

  const isStepDone = (step: LaunchpadStep) => {
    if (step.onboardingKey && completedKeys.has(step.onboardingKey)) return true;
    if (step.id === "pack" && (progress.data?.completed_count ?? 0) > 0) return true;
    return false;
  };

  const allSteps = LAUNCHPAD_STEPS.map((s) => (s.id === "ceo" ? { ...s, href: ceoHref } : s));
  const doneCount = allSteps.filter(isStepDone).length;
  const progressPct = Math.round((doneCount / allSteps.length) * 100);

  if (!isAuthenticated || isBootstrapping) {
    return (
      <PanelCard>
        <p className="text-sm text-muted-foreground">Cargando Launchpad…</p>
      </PanelCard>
    );
  }

  return (
    <div className="space-y-6">
      <PanelCard accent="from-primary/10 via-card to-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Launchpad Nelvyon
            </p>
            <h2 className="mt-1 text-xl font-semibold">De cero a resultados en 30 días</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Tu centro de mando: un solo hilo que conecta packs, Ads, embudos, email y
              dashboards CEO. Sin pantallas vacías — cada paso abre una plantilla oficial Nelvyon.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-primary">{progressPct}%</p>
            <p className="text-xs text-muted-foreground">
              {doneCount}/{allSteps.length} pasos
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </PanelCard>

      {(["day1", "week1", "month1"] as LaunchpadPhase[]).map((phase) => {
        const steps = stepsForPhase(phase, ceoHref);
        return (
          <section key={phase}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Rocket aria-hidden className="h-4 w-4" />
              {PHASE_LABELS[phase]}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step) => {
                const done = isStepDone(step);
                return (
                  <div
                    className={`rounded-xl border p-4 transition ${
                      done
                        ? "border-success/40 bg-success/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                    key={step.id}
                  >
                    <div className="flex items-start gap-2">
                      {done ? (
                        <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      ) : (
                        <Circle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{step.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                        <Button asChild className="mt-3" size="sm" variant={done ? "outline" : "default"}>
                          <Link href={step.href}>{step.cta}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <PanelCard>
        <p className="text-sm font-medium">Sistema Ads + Funnel + Nurture (2–3 clics)</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Las plantillas élite de Publicidad, Embudos y Email comparten sectores (local, ecommerce,
          SaaS B2B) y se activan desde cada módulo o desde tu Growth Pack.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/publicidad">Ads</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/funnels">Embudos</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/campaigns">Email</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/os/packs">Growth Packs</Link>
          </Button>
        </div>
      </PanelCard>
    </div>
  );
}
