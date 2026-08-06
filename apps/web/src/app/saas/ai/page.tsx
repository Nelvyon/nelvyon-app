"use client";

/**
 * /saas/ai sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: rejilla de estado -> `W3crmContentBox` + `card` de Bootstrap con
 * `W3crmStatusBadge`; KPIs -> `W3crmKpiTile`; espera -> `W3crmCargando`. Sin
 * componentes nuevos.
 *
 * Inventario: sin `data-testid`. Contrato de texto en
 * `capture-marketing-shots.spec.ts:46`: `/Panel IA|Router|MCP/i`, que
 * satisfacen el titulo "Panel IA" y las tarjetas "Router de modelos" y "MCP
 * productivo". Sin `data-testid` ni spec dedicado mas alla de
 * `saas-nav-full-coverage` y `dashboard.spec.ts:89` (el enlace del nav).
 *
 * NO se toca la capa de IA ni su routing: `fetchJson` conserva
 * `credentials: "include"` y las DIEZ llamadas en paralelo con sus rutas y
 * `resource` exactos (`private-ai/router-health`, `mcp`,
 * `shared-memory?resource=status`, `private-ai/agents`,
 * `orchestrator?resource=status`, `private-ai/metrics`, y los cuatro
 * `ai-agents?resource=` status/workflows/runtime/canaries). Se conservan
 * tambien el calculo de `agentCount` con sus dos formas de respuesta, los
 * cuatro contadores, y el estado de cada tarjeta (incluido el `crit` por
 * `emergencyStop` y los `pending` por flag). Solo cambia la presentacion.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmKpiTile, W3crmStatusBadge } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

type EstadoIA = "ok" | "warn" | "crit" | "pending";

type StatusCard = {
  id: string;
  title: string;
  icon: string;
  href: string;
  body: string;
  status: EstadoIA;
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

/** Un `data` nulo o no-objeto rompia todos los accesos encadenados. */
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function largo(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

const ESTADO_LABEL: Record<EstadoIA, string> = {
  ok: "ready", warn: "atención", crit: "crítico", pending: "standby",
};

export default function SaasAiPanelPage() {
  const [cards, setCards] = useState<StatusCard[]>([]);
  const [kpis, setKpis] = useState<{
    agentRuns: number; openClawDispatches: number; unifiedTotal: number; runtimeReady: number;
  } | null>(null);
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

    const agentsData = obj(agents.data);
    const agentCount = Array.isArray(agentsData.agents)
      ? agentsData.agents.length
      : Array.isArray(agents.data)
        ? (agents.data as unknown[]).length
        : 0;

    const unifiedData = obj(unified.data);
    const unifiedTotal = num(unifiedData.total);
    const runtimeReady = num(unifiedData.runtimeReady);
    const counters = obj(obj(metrics.data).counters);
    const agentRuns = num(counters.agentRuns);
    const openClawDispatches = num(counters.openClawDispatches);

    const memoryData = obj(memory.data);
    const orchData = obj(orch.data);
    const workflowsData = obj(workflows.data);
    const runtimeData = obj(runtime.data);
    const canariesData = obj(canaries.data);

    setKpis({ agentRuns, openClawDispatches, unifiedTotal, runtimeReady });

    setCards([
      {
        id: "router", title: "Router de modelos", icon: "fa-solid fa-compass",
        href: "/api/saas/private-ai/router-health",
        status: router.ok ? "ok" : "warn",
        body: router.ok ? "Certificado · health OK" : `HTTP ${router.status}`,
      },
      {
        id: "mcp", title: "MCP productivo", icon: "fa-solid fa-plug",
        href: "/api/saas/mcp",
        status: mcp.ok ? "ok" : "warn",
        body: mcp.ok ? "Disponible" : `HTTP ${mcp.status}`,
      },
      {
        id: "memory", title: "Shared Memory", icon: "fa-solid fa-brain",
        href: "/api/saas/shared-memory?resource=status",
        status: memory.ok && Boolean(memoryData.enabled) ? "ok" : "pending",
        body: memory.ok
          ? (memoryData.enabled
              // `contractVersion` ausente pintaba "v undefined".
              ? `ON · v${String(memoryData.contractVersion ?? "—")} · content security ON`
              : "OFF (flag) — set NELVYON_SHARED_MEMORY_ENABLED=1")
          : `HTTP ${memory.status}`,
      },
      {
        id: "agents", title: "Agentes runtime", icon: "fa-solid fa-bolt",
        href: "/api/saas/private-ai/agents",
        status: agents.ok ? "ok" : "warn",
        body: agents.ok
          ? `${agentCount || "—"} Private AI · unified ${runtimeReady}/${unifiedTotal || "—"} ready`
          : `HTTP ${agents.status}`,
      },
      {
        id: "orch", title: "Orquestador", icon: "fa-solid fa-screwdriver-wrench",
        href: "/api/saas/orchestrator?resource=status",
        status: orch.ok && Boolean(orchData.enabled) ? "ok" : "pending",
        body: orch.ok
          ? (orchData.enabled ? "ON · sandbox executor (LIVE opt-in)" : "OFF (flag)")
          : `HTTP ${orch.status}`,
      },
      {
        id: "metrics", title: "Métricas IA", icon: "fa-solid fa-chart-line",
        href: "/api/saas/private-ai/metrics",
        status: metrics.ok ? "ok" : "warn",
        body: metrics.ok ? `runs=${agentRuns} · openClaw=${openClawDispatches}` : `HTTP ${metrics.status}`,
      },
      {
        id: "elite", title: "Elite cert (repo)", icon: "fa-solid fa-medal",
        href: "docs/PHASE2_ELITE_CERT.md",
        status: "ok",
        body: "PASS (phase2EliteCertified) · residuales Docker/ops documentados",
      },
      {
        id: "workforce", title: "Fuerza de trabajo", icon: "fa-solid fa-users",
        href: "/api/saas/ai-agents?resource=org",
        status: unified.ok ? "ok" : "warn",
        body: unified.ok
          ? `unified ${unifiedTotal || "—"} · ready ${runtimeReady || "—"} · org chart ADR-027`
          : `HTTP ${unified.status}`,
      },
      {
        id: "workflows", title: "Workflows enterprise", icon: "fa-solid fa-rotate",
        href: "/api/saas/ai-agents?resource=workflows",
        status: workflows.ok ? "ok" : "warn",
        body: workflows.ok
          ? `${workflowsData.certified ?? "—"} certificados · ${workflowsData.total ?? "—"} total`
          : `HTTP ${workflows.status}`,
      },
      {
        id: "runtime", title: "Runtime / daemon", icon: "fa-solid fa-gear",
        href: "/api/saas/ai-agents?resource=runtime",
        status: runtime.ok ? (runtimeData.emergencyStop ? "crit" : "ok") : "warn",
        body: runtime.ok
          ? `daemon=${runtimeData.daemonEnabled ? "on" : "off"} · mode=${String(runtimeData.operationMode ?? "—")} · kill=${runtimeData.emergencyStop ? "ON" : "off"}`
          : `HTTP ${runtime.status}`,
      },
      {
        id: "canary", title: "Canary / mejoras", icon: "fa-solid fa-dove",
        href: "/api/saas/ai-agents?resource=canaries",
        status: canaries.ok ? "pending" : "warn",
        body: canaries.ok
          ? `canaries=${largo(canariesData.canaries)} · leaderboard /api/saas/ai-agents?resource=leaderboard`
          : `HTTP ${canaries.status}`,
      },
      {
        id: "leaderboard", title: "Leaderboard por capacidad", icon: "fa-solid fa-trophy",
        href: "/api/saas/ai-agents?resource=leaderboard",
        status: unified.ok ? "ok" : "pending",
        body: "Ranking por capacidad (no score global engañoso)",
      },
    ]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Panel IA" parentTitle="Inteligencia" pageTitle="Panel IA" />
      <div className="container-fluid">
        <div className="row">
          {kpis && (
            <>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Ejecuciones de agentes" value={kpis.agentRuns} accent />
              </div>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Dispatches OpenClaw" value={kpis.openClawDispatches} />
              </div>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Fuerza de trabajo unificada" value={kpis.unifiedTotal || "—"} />
              </div>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Runtime ready" value={`${kpis.runtimeReady}/${kpis.unifiedTotal || "—"}`} />
              </div>
            </>
          )}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Estado en vivo de la plataforma de inteligencia propia Nelvyon — router, memoria,
              orquestador y agentes. Router y MCP certificados · Memoria / Orquestador activables por
              flag · OpenClaw solo con memoria ON
            </p>

            <W3crmContentBox
              titulo="Estado de la plataforma"
              icono="fa-solid fa-microchip"
              acciones={
                <button type="button" className="btn btn-primary light btn-sm me-2" disabled={refreshing}
                  onClick={() => void load()}>
                  {refreshing ? "Actualizando…" : "Actualizar"}
                </button>
              }
            >
              {loading ? (
                <W3crmCargando texto="Consultando servicios de IA…" />
              ) : (
                <div className="row">
                  {cards.map((c) => (
                    <div className="col-xl-4 col-sm-6" key={c.id}>
                      <div className="card border mb-3">
                        <div className="card-body">
                          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                            <span className="fw-bold">
                              <i className={`${c.icon} me-2 text-primary`} aria-hidden="true" />
                              {c.title}
                            </span>
                            <W3crmStatusBadge status={c.status} label={ESTADO_LABEL[c.status]} />
                          </div>
                          <p className="text-muted fs-14 mb-1">{c.body}</p>
                          <p className="text-muted fs-12 text-truncate mb-0">{c.href}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
