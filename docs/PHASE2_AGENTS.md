# PHASE2 — Agentes especialistas (diseño)

Catálogo: `backend/agents/specialistCatalog.ts` — **23 agentes** con responsabilidades, tools, permisos, memoria, límites, aprobaciones, KPIs, tests previstos.

## Lista

CEO · CTO · Marketing · SEO · SEM/Google Ads · Meta Ads · TikTok Ads · Ventas · CRM · Soporte · Contenido · Social · Automatizaciones · Analítica · DevOps · QA · Seguridad · Diseño · Vídeo · Imagen · Documentación · Operaciones · Finanzas

## Relación con registry actual

`nelvyonAgentRegistry.ts` (17) sigue siendo el runtime Private AI actual. El catálogo de diseño es la fuente para expansión post-orquestador **sin activar OpenClaw aún**.

## Tests

`phase2PrepContracts.test.ts` → `assertAgentCatalogComplete()`
