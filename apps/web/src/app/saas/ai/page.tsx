"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
  NelvyonDsStatusDot,
  type NelvyonDsStatus,
} from "@/design-system/components";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type StatusCard = {
  id: string;
  title: string;
  icon: string;
  href: string;
  body: string;
  status: NelvyonDsStatus;
};

async function fetchJson(path: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(path, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e instanceof Error ? e.message : "fetch_failed" } };
  }
}

export default function SaasAiPanelPage() {
  const [cards, setCards] = useState<StatusCard[]>([]);
  const [kpis, setKpis] = useState<{ agentRuns: number; openClawDispatches: number; unifiedTotal: number; runtimeReady: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [router, mcp, memory, agents, orch, metrics, unified, workflows, runtime, canaries] = await Promise.all([
      fetchJson("/api/saas/private-ai/router-health"),
      fetchJson("/api/saas/mcp"),
      fetchJson("/api/saas/shared-memory?resource=status"),
      fetchJson("/api/saas/private-ai/agents"),
      fetchJson("/api/saas/orchestrator?resource=status"),
      fetchJson("/api/saas/private-ai/metrics"),
      fetchJson("/api/saas/ai-agents?resource=status"),
      fetchJson("/api/saas/ai-agents?resource=workflows"),
      fetchJson("/api/saas/ai-agents?resource=runtime"),
      fetchJson("/api/saas/ai-agents?resource=canaries"),
    ]);

    const agentCount = Array.isArray((agents.data as { agents?: unknown[] })?.agents)
      ? (agents.data as { agents: unknown[] }).agents.length
      : Array.isArray(agents.data)
        ? (agents.data as unknown[]).length
        : 0;
    const unifiedTotal = Number((unified.data as { total?: number })?.total ?? 0);
    const runtimeReady = Number((unified.data as { runtimeReady?: number })?.runtimeReady ?? 0);
    const agentRuns = Number((metrics.data as { counters?: { agentRuns?: number } })?.counters?.agentRuns ?? 0);
    const openClawDispatches = Number((metrics.data as { counters?: { openClawDispatches?: number } })?.counters?.openClawDispatches ?? 0);

    setKpis({ agentRuns, openClawDispatches, unifiedTotal, runtimeReady });

    setCards([
      {
        id: "router",
        title: "Router de modelos",
        icon: "🧭",
        href: "/api/saas/private-ai/router-health",
        status: router.ok ? "ok" : "warn",
        body: router.ok ? "Certificado · health OK" : `HTTP ${router.status}`,
      },
      {
        id: "mcp",
        title: "MCP productivo",
        icon: "🔌",
        href: "/api/saas/mcp",
        status: mcp.ok ? "ok" : "warn",
        body: mcp.ok ? "Disponible" : `HTTP ${mcp.status}`,
      },
      {
        id: "memory",
        title: "Shared Memory",
        icon: "🧠",
        href: "/api/saas/shared-memory?resource=status",
        status: memory.ok && Boolean((memory.data as { enabled?: boolean })?.enabled) ? "ok" : "pending",
        body: memory.ok
          ? ((memory.data as { enabled?: boolean; contractVersion?: string }).enabled
              ? `ON · v${(memory.data as { contractVersion?: string }).contractVersion} · content security ON`
              : "OFF (flag) — set NELVYON_SHARED_MEMORY_ENABLED=1")
          : `HTTP ${memory.status}`,
      },
      {
        id: "agents",
        title: "Agentes runtime",
        icon: "⚡",
        href: "/api/saas/private-ai/agents",
        status: agents.ok ? "ok" : "warn",
        body: agents.ok
          ? `${agentCount || "—"} Private AI · unified ${runtimeReady}/${unifiedTotal || "—"} ready`
          : `HTTP ${agents.status}`,
      },
      {
        id: "orch",
        title: "Orquestador",
        icon: "🛠️",
        href: "/api/saas/orchestrator?resource=status",
        status: orch.ok && Boolean((orch.data as { enabled?: boolean })?.enabled) ? "ok" : "pending",
        body: orch.ok
          ? ((orch.data as { enabled?: boolean }).enabled
              ? "ON · sandbox executor (LIVE opt-in)"
              : "OFF (flag)")
          : `HTTP ${orch.status}`,
      },
      {
        id: "metrics",
        title: "Métricas IA",
        icon: "📈",
        href: "/api/saas/private-ai/metrics",
        status: metrics.ok ? "ok" : "warn",
        body: metrics.ok
          ? `runs=${agentRuns} · openClaw=${openClawDispatches}`
          : `HTTP ${metrics.status}`,
      },
      {
        id: "elite",
        title: "Elite cert (repo)",
        icon: "🏅",
        href: "docs/PHASE2_ELITE_CERT.md",
        status: "ok",
        body: "PASS (phase2EliteCertified) · residuales Docker/ops documentados",
      },
      {
        id: "workforce",
        title: "Fuerza de trabajo",
        icon: "👥",
        href: "/api/saas/ai-agents?resource=org",
        status: unified.ok ? "ok" : "warn",
        body: unified.ok
          ? `unified ${unifiedTotal || "—"} · ready ${runtimeReady || "—"} · org chart ADR-027`
          : `HTTP ${unified.status}`,
      },
      {
        id: "workflows",
        title: "Workflows enterprise",
        icon: "🔁",
        href: "/api/saas/ai-agents?resource=workflows",
        status: workflows.ok ? "ok" : "warn",
        body: workflows.ok
          ? `${(workflows.data as { certified?: number }).certified ?? "—"} certificados · ${(workflows.data as { total?: number }).total ?? "—"} total`
          : `HTTP ${workflows.status}`,
      },
      {
        id: "runtime",
        title: "Runtime / daemon",
        icon: "⚙️",
        href: "/api/saas/ai-agents?resource=runtime",
        status: runtime.ok ? ((runtime.data as { emergencyStop?: boolean }).emergencyStop ? "crit" : "ok") : "warn",
        body: runtime.ok
          ? `daemon=${(runtime.data as { daemonEnabled?: boolean }).daemonEnabled ? "on" : "off"} · mode=${(runtime.data as { operationMode?: string }).operationMode ?? "—"} · kill=${(runtime.data as { emergencyStop?: boolean }).emergencyStop ? "ON" : "off"}`
          : `HTTP ${runtime.status}`,
      },
      {
        id: "canary",
        title: "Canary / mejoras",
        icon: "🕊️",
        href: "/api/saas/ai-agents?resource=canaries",
        status: canaries.ok ? "pending" : "warn",
        body: canaries.ok
          ? `canaries=${Array.isArray((canaries.data as { canaries?: unknown[] }).canaries) ? (canaries.data as { canaries: unknown[] }).canaries.length : 0} · leaderboard /api/saas/ai-agents?resource=leaderboard`
          : `HTTP ${canaries.status}`,
      },
      {
        id: "leaderboard",
        title: "Leaderboard por capacidad",
        icon: "🏆",
        href: "/api/saas/ai-agents?resource=leaderboard",
        status: unified.ok ? "ok" : "pending",
        body: "Ranking por capacidad (no score global engañoso)",
      },
    ]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel: Record<NelvyonDsStatus, string> = { ok: "ready", warn: "atención", crit: "crítico", pending: "standby" };
  const statusBadgeTone: Record<NelvyonDsStatus, "success" | "warning" | "danger" | "neutral"> = {
    ok: "success",
    warn: "warning",
    crit: "danger",
    pending: "neutral",
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="ai" />}>
      <div className="space-y-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Panel IA"
            subtitle="Estado en vivo de la plataforma de inteligencia propia Nelvyon — router, memoria, orquestador y agentes"
          />
          <NelvyonDsButton variant="ghost" onClick={() => void load()} disabled={refreshing}>
            {refreshing ? "Actualizando…" : "↻ Actualizar"}
          </NelvyonDsButton>
        </div>

        {kpis && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile icon="⚡" label="Ejecuciones de agentes" value={kpis.agentRuns} accent />
            <KpiTile icon="🕊️" label="Dispatches OpenClaw" value={kpis.openClawDispatches} />
            <KpiTile icon="👥" label="Fuerza de trabajo unificada" value={kpis.unifiedTotal || "—"} />
            <KpiTile icon="✅" label="Runtime ready" value={`${kpis.runtimeReady}/${kpis.unifiedTotal || "—"}`} />
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Router y MCP certificados · Memoria / Orquestador activables por flag · OpenClaw solo con memoria ON
        </p>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/20" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <NelvyonDsCard key={c.id} className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">{c.icon}</span>
                    <h2 className="font-semibold text-foreground text-sm">{c.title}</h2>
                  </div>
                  <NelvyonDsBadge tone={statusBadgeTone[c.status]} className="inline-flex items-center gap-1.5">
                    <NelvyonDsStatusDot status={c.status} />
                    {statusLabel[c.status]}
                  </NelvyonDsBadge>
                </div>
                <p className="text-sm text-muted-foreground">{c.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/60 font-mono truncate">{c.href}</p>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}
