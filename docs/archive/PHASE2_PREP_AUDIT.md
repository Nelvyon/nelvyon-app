# Auditoría enterprise (safe) — durante soak MCP

> 2026-07-16 · **Sin cambios** a MCP, Router, Docker, Ollama, Postgres runtime

## Hallazgos (documentación / prep)

| Área | Hallazgo | Acción |
|---|---|---|
| AI_CONTEXT | Router marcado 🟡 desactualizado | ✅ Actualizado a certificado+wired |
| ROADMAP Fase 2 | Desactualizado vs ADR-015/016/017 | ✅ Actualizado |
| DATABASE | Schema shared memory | ✅ Propuesto, **no migrado** |
| Integraciones | MCP/OpenClaw/Memory | ✅ Filas añadidas |
| Duplicidad agentes | Registry 17 runtime vs catálogo 23 diseño | Documentado — unificar post-orch (no ahora) |
| MCP legacy vs productivo | Dos paths (`NelvyonMcpService` + productivo) | Convivencia intencional; unificar post-cert |
| Dep `@modelcontextprotocol` | No instalada | OK — productive propio; Labs flag OFF |
| Soak MCP | Proceso vivo | **No tocar** |

## Riesgos diferidos (post-cert)

1. Unificar tool registries MCP legacy/productivo
2. Promover `schema.proposed.sql` → migración 512
3. Wiring Shared Memory → Router/agents
4. Panel `/saas/ai` implementación UI

## No corregido a propósito

Cualquier refactor en `backend/mcp/**` o `backend/local-ai/router/**` — prohibido durante soak.
