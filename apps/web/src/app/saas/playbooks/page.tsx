"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import type {
  DataPlaybook,
  DataPlaybookStep,
  PlaybooksSummary,
  PlaybookCategory,
  PlaybookStepType,
} from "@nelvyon/saas";

// ── Display maps ──────────────────────────────────────────────────────────────

const CATEGORY_TONE: Record<PlaybookCategory, "success" | "primary" | "warning" | "danger" | "neutral"> = {
  growth: "primary",
  retention: "success",
  ads: "warning",
  email: "primary",
  seo: "neutral",
  compliance: "danger",
};

const STEP_ICON: Record<PlaybookStepType, string> = {
  insight: "💡",
  action: "✅",
  email_draft: "✉️",
  launch_pack: "🚀",
  enable_autopilot: "🤖",
  review_metric: "📊",
};

function stepCta(step: DataPlaybookStep, packId: string | null): { label: string; href: string } | null {
  const href = (step.metadata as { href?: string }).href;
  switch (step.stepType) {
    case "launch_pack": {
      const pid = (step.metadata as { packId?: string }).packId ?? packId;
      return { label: "Lanzar pack", href: `/saas/brief-to-launch${pid ? `?packId=${pid}` : ""}` };
    }
    case "enable_autopilot":
      return { label: "Ir a Autopilot", href: href ?? "/saas/autopilot" };
    case "review_metric":
      return { label: "Revisar", href: href ?? "/saas/benchmark" };
    default:
      return href ? { label: "Abrir", href } : null;
  }
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

// ── Playbook card ─────────────────────────────────────────────────────────────

function PlaybookCard({
  pb,
  onActivate,
  onDismiss,
  onComplete,
  onCompleteStep,
}: {
  pb: DataPlaybook;
  onActivate: (id: string) => void;
  onDismiss: (id: string) => void;
  onComplete: (id: string) => void;
  onCompleteStep: (playbookId: string, stepId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<DataPlaybookStep[]>(pb.steps ?? []);
  const [loadingSteps, setLoadingSteps] = useState(false);

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && steps.length === 0) {
      setLoadingSteps(true);
      try {
        const res = await fetch(`/api/saas/data-playbooks/${pb.id}`);
        if (res.ok) {
          const d = (await res.json()) as { playbook: DataPlaybook };
          setSteps(d.playbook.steps ?? []);
        }
      } finally {
        setLoadingSteps(false);
      }
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold text-sm">{pb.title}</h3>
            <NelvyonDsBadge tone={CATEGORY_TONE[pb.category]}>{pb.category}</NelvyonDsBadge>
            {pb.status === "active" && <NelvyonDsBadge tone="success">Activo</NelvyonDsBadge>}
            {pb.status === "completed" && <NelvyonDsBadge tone="neutral">Completado</NelvyonDsBadge>}
          </div>
          <p className="text-amber-300/80 text-[11px] mt-1">⚡ {pb.triggerReason}</p>
        </div>
        <span className="text-white/30 text-[10px]">P{pb.priority}</span>
      </div>

      {pb.renderedSummary && <p className="text-white/60 text-xs leading-relaxed">{pb.renderedSummary}</p>}

      <button onClick={() => void toggle()} className="text-[#0084ff] text-xs hover:underline">
        {expanded ? "Ocultar pasos" : "Ver pasos"}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          {loadingSteps ? (
            <p className="text-white/30 text-xs">Cargando pasos…</p>
          ) : steps.length === 0 ? (
            <p className="text-white/30 text-xs">Sin pasos.</p>
          ) : (
            steps.map((s) => {
              const cta = stepCta(s, pb.packId);
              return (
                <div key={s.id} className="rounded-lg bg-black/20 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${s.completed ? "text-white/30 line-through" : "text-white/80"}`}>
                      {STEP_ICON[s.stepType]} {s.title}
                    </span>
                    {!s.completed && (
                      <button
                        onClick={() => onCompleteStep(pb.id, s.id)}
                        className="text-white/40 hover:text-green-400 text-[10px]"
                      >
                        marcar ✓
                      </button>
                    )}
                  </div>
                  <p className="text-white/50 text-[11px] leading-relaxed">{s.body}</p>
                  {cta && (
                    <Link href={cta.href} className="inline-block text-[#0084ff] text-[11px] hover:underline">
                      {cta.label} →
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Actions */}
      {pb.status !== "completed" && pb.status !== "dismissed" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {pb.status === "suggested" && (
            <button onClick={() => onActivate(pb.id)} className="rounded-lg bg-[#0084ff] px-3 py-1.5 text-xs text-white hover:bg-[#0070dd]">
              Activar
            </button>
          )}
          <button onClick={() => onComplete(pb.id)} className="rounded-lg bg-green-600/70 px-3 py-1.5 text-xs text-white hover:bg-green-600">
            Marcar completado
          </button>
          <button onClick={() => onDismiss(pb.id)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20">
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlaybooksPage() {
  const [summary, setSummary] = useState<PlaybooksSummary | null>(null);
  const [playbooks, setPlaybooks] = useState<DataPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/data-playbooks");
      if (res.ok) {
        const d = (await res.json()) as { summary: PlaybooksSummary; playbooks: DataPlaybook[] };
        setSummary(d.summary);
        setPlaybooks((d.playbooks ?? []).filter((p) => p.status !== "dismissed"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/saas/data-playbooks/refresh", { method: "POST" });
      if (res.ok) {
        const d = (await res.json()) as { generated: number };
        showToast(`${d.generated} playbook(s) generados`);
        void load();
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function patchPlaybook(id: string, action: "activate" | "dismiss" | "complete") {
    const res = await fetch(`/api/saas/data-playbooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      showToast(action === "dismiss" ? "Playbook descartado" : action === "complete" ? "Playbook completado" : "Playbook activado");
      void load();
    }
  }

  async function completeStep(playbookId: string, stepId: string) {
    const res = await fetch(`/api/saas/data-playbooks/${playbookId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    if (res.ok) showToast("Paso completado");
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="data-playbooks" />}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Playbooks · Tus datos</h1>
            <p className="text-white/50 text-sm mt-1">
              Planes de acción generados con tus métricas reales
            </p>
          </div>
          <button
            disabled={refreshing || loading}
            onClick={() => { void handleRefresh(); }}
            className="rounded-xl bg-[#0084ff] px-4 py-2 text-sm text-white font-medium disabled:opacity-50 hover:bg-[#0070dd] transition-colors"
          >
            {refreshing ? "Generando…" : "↻ Actualizar"}
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Sugeridos" value={summary.suggested} />
            <KpiCard label="Activos" value={summary.active} />
            <KpiCard label="Completados" value={summary.completed} />
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando playbooks…</div>
        ) : playbooks.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-14 text-center space-y-3">
            <div className="text-4xl">📋</div>
            <p className="text-white font-semibold">Aún no hay playbooks personalizados</p>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Lanza un pack o envía campañas de email para que generemos playbooks con tus datos.
              Después pulsa <strong className="text-white/60">↻ Actualizar</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {playbooks.map((pb) => (
              <PlaybookCard
                key={pb.id}
                pb={pb}
                onActivate={(id) => void patchPlaybook(id, "activate")}
                onDismiss={(id) => void patchPlaybook(id, "dismiss")}
                onComplete={(id) => void patchPlaybook(id, "complete")}
                onCompleteStep={(pid, sid) => void completeStep(pid, sid)}
              />
            ))}
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#0084ff] px-4 py-2 text-white text-sm shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}
