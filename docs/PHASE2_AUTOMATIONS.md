# PHASE2 — Automatizaciones (diseño)

Flujos en `backend/automations/flowDesigns.ts`.

## Independientes de MCP (listos para implementar tras agentes/orquestador)

- Brief CEO diario
- Auditoría SEO semanal
- Deals CRM estancados
- SLA soporte
- Digest seguridad

## Dependientes de MCP (NO implementar hasta cert)

- Pulse salud MCP (`health_check` tool)

## Validaciones comunes

- tenant required
- approval before send
- no secrets in reports
- read-only where applicable
