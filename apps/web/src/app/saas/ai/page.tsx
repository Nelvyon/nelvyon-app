"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type StatusCard = {
  id: string;
  title: string;
  href: string;
  body: string;
  ok?: boolean;
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [router, mcp, memory, agents, orch, metrics, unified] = await Promise.all([
      fetchJson("/api/saas/private-ai/router-health"),
      fetchJson("/api/saas/mcp"),
      fetchJson("/api/saas/shared-memory?resource=status"),
      fetchJson("/api/saas/private-ai/agents"),
      fetchJson("/api/saas/orchestrator?resource=status"),
      fetchJson("/api/saas/private-ai/metrics"),
      fetchJson("/api/saas/ai-agents?resource=status"),
    ]);

    const agentCount = Array.isArray((agents.data as { agents?: unknown[] })?.agents)
      ? (agents.data as { agents: unknown[] }).agents.length
      : Array.isArray(agents.data)
        ? (agents.data as unknown[]).length
        : 0;
    const unifiedTotal = Number((unified.data as { total?: number })?.total ?? 0);
    const runtimeReady = Number((unified.data as { runtimeReady?: number })?.runtimeReady ?? 0);

    setCards([
      {
        id: "router",
        title: "Router de modelos",
        href: "/api/saas/private-ai/router-health",
        ok: router.ok,
        body: router.ok ? "Certificado · health OK" : `HTTP ${router.status}`,
      },
      {
        id: "mcp",
        title: "MCP productivo",
        href: "/api/saas/mcp",
        ok: mcp.ok,
        body: mcp.ok ? "Disponible" : `HTTP ${mcp.status}`,
      },
      {
        id: "memory",
        title: "Shared Memory",
        href: "/api/saas/shared-memory?resource=status",
        ok: memory.ok && Boolean((memory.data as { enabled?: boolean })?.enabled),
        body: memory.ok
          ? ((memory.data as { enabled?: boolean; contractVersion?: string }).enabled
              ? `ON · v${(memory.data as { contractVersion?: string }).contractVersion} · content security ON`
              : "OFF (flag) — set NELVYON_SHARED_MEMORY_ENABLED=1")
          : `HTTP ${memory.status}`,
      },
      {
        id: "agents",
        title: "Agentes runtime",
        href: "/api/saas/private-ai/agents",
        ok: agents.ok,
        body: agents.ok
          ? `${agentCount || "—"} Private AI · unified ${runtimeReady}/${unifiedTotal || "—"} ready`
          : `HTTP ${agents.status}`,
      },
      {
        id: "orch",
        title: "Orquestador",
        href: "/api/saas/orchestrator?resource=status",
        ok: orch.ok && Boolean((orch.data as { enabled?: boolean })?.enabled),
        body: orch.ok
          ? ((orch.data as { enabled?: boolean }).enabled
              ? "ON · sandbox executor (LIVE opt-in)"
              : "OFF (flag)")
          : `HTTP ${orch.status}`,
      },
      {
        id: "metrics",
        title: "Métricas IA",
        href: "/api/saas/private-ai/metrics",
        ok: metrics.ok,
        body: metrics.ok
          ? `runs=${(metrics.data as { counters?: { agentRuns?: number } })?.counters?.agentRuns ?? 0} · openClaw=${(metrics.data as { counters?: { openClawDispatches?: number } })?.counters?.openClawDispatches ?? 0}`
          : `HTTP ${metrics.status}`,
      },
      {
        id: "elite",
        title: "Elite cert (repo)",
        href: "docs/PHASE2_ELITE_CERT.md",
        ok: false,
        body: "CONDITIONAL PASS en sandbox · PHASE2_ELITE_CERTIFIED=false hasta E2E live + ops",
      },
      {
        id: "workflows",
        title: "Workflows enterprise",
        href: "/api/saas/orchestrator",
        ok: orch.ok,
        body: "10 workflows sandbox-certificables (seo, CRM, support, informe…)",
      },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="ai" />}>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Panel IA</h1>
          <p className="mt-1 text-sm text-white/50">
            Estado de la plataforma de inteligencia propia Nelvyon (Fase 2)
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/50">
            Router y MCP certificados · Memoria / Orquestador activables por flag · OpenClaw solo con memoria ON
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-white/40 text-sm">Cargando estado…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-white font-medium">{c.title}</h2>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      c.ok ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {c.ok ? "ready" : "standby"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/60">{c.body}</p>
                <p className="mt-3 text-[11px] text-white/30 font-mono truncate">{c.href}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}
