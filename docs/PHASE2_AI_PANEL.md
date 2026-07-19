# PHASE2 — Panel IA (diseño)

## Ruta prevista

`/saas/ai` — `SaasShellLayout` · dark glass `#020817`

## Navegación

Overview · Router · MCP · Memoria · Agentes · Orquestador · Herramientas · Aprobaciones · Auditoría · Métricas · Ajustes

## Widgets (contratos)

`backend/ai-panel/contracts.ts` — dataSources mapeados a APIs existentes (`router-health`, `/api/saas/mcp`, agents, approvals, audit) + futuros memory/orchestrator.

## Permisos

`ai.panel.read` · `ai.approvals.review` · `ai.audit.read` · `ai.settings.write`

## UX

- Un estado por sección (no dashboard sobrecargado en hero)
- Badges de certificación Router/MCP
- Cola de aprobaciones accionable
- Sin telemetría externa
