/**
 * AI Control Panel — UI architecture contracts (design only).
 */

export const AI_PANEL_CONTRACT_VERSION = "1.0.0";

export type AiPanelNavId =
  | "overview"
  | "router"
  | "mcp"
  | "memory"
  | "agents"
  | "orchestrator"
  | "tools"
  | "approvals"
  | "audit"
  | "metrics"
  | "settings";

export type AiPanelPermission =
  | "ai.panel.read"
  | "ai.panel.write"
  | "ai.approvals.review"
  | "ai.audit.read"
  | "ai.settings.write";

export type AiPanelWidget = {
  id: string;
  nav: AiPanelNavId;
  title: string;
  dataSource: string;
  refreshSec: number;
  permission: AiPanelPermission;
};

export const AI_PANEL_NAV: Array<{ id: AiPanelNavId; label: string; permission: AiPanelPermission }> = [
  { id: "overview", label: "Overview", permission: "ai.panel.read" },
  { id: "router", label: "Router", permission: "ai.panel.read" },
  { id: "mcp", label: "MCP", permission: "ai.panel.read" },
  { id: "memory", label: "Memoria", permission: "ai.panel.read" },
  { id: "agents", label: "Agentes", permission: "ai.panel.read" },
  { id: "orchestrator", label: "Orquestador", permission: "ai.panel.read" },
  { id: "tools", label: "Herramientas", permission: "ai.panel.read" },
  { id: "approvals", label: "Aprobaciones", permission: "ai.approvals.review" },
  { id: "audit", label: "Auditoría", permission: "ai.audit.read" },
  { id: "metrics", label: "Métricas", permission: "ai.panel.read" },
  { id: "settings", label: "Ajustes", permission: "ai.settings.write" },
];

export const AI_PANEL_WIDGETS: AiPanelWidget[] = [
  { id: "router_health", nav: "router", title: "Router health", dataSource: "/api/saas/private-ai/router-health", refreshSec: 30, permission: "ai.panel.read" },
  { id: "mcp_health", nav: "mcp", title: "MCP health", dataSource: "/api/saas/mcp", refreshSec: 30, permission: "ai.panel.read" },
  { id: "agents_list", nav: "agents", title: "Agentes", dataSource: "/api/saas/private-ai/agents", refreshSec: 60, permission: "ai.panel.read" },
  { id: "approvals_queue", nav: "approvals", title: "Cola aprobaciones", dataSource: "/api/saas/private-ai/approvals", refreshSec: 15, permission: "ai.approvals.review" },
  { id: "audit_feed", nav: "audit", title: "Audit feed", dataSource: "/api/saas/private-ai/audit", refreshSec: 30, permission: "ai.audit.read" },
  { id: "metrics_snapshot", nav: "metrics", title: "Métricas IA", dataSource: "/api/saas/private-ai/metrics", refreshSec: 20, permission: "ai.panel.read" },
  { id: "memory_status", nav: "memory", title: "Memoria compartida", dataSource: "/api/saas/shared-memory?resource=status", refreshSec: 60, permission: "ai.panel.read" },
  { id: "orch_queue", nav: "orchestrator", title: "Cola orquestador", dataSource: "/api/saas/orchestrator?resource=jobs", refreshSec: 20, permission: "ai.panel.read" },
];

export type AiPanelRoutePlan = {
  path: string;
  layout: "SaasShellLayout";
  activeId: "ai" | "private-ai";
  dynamic: "force-dynamic";
};

export const AI_PANEL_ROUTE_PLAN: AiPanelRoutePlan = {
  path: "/saas/ai",
  layout: "SaasShellLayout",
  activeId: "ai",
  dynamic: "force-dynamic",
};

export function assertAiPanelDesign(): { ok: boolean; navCount: number; widgetCount: number } {
  return {
    ok: AI_PANEL_NAV.length >= 10 && AI_PANEL_WIDGETS.length >= 6,
    navCount: AI_PANEL_NAV.length,
    widgetCount: AI_PANEL_WIDGETS.length,
  };
}
