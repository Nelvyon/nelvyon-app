# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Deploy fix: track MCP + local-ai router for Railway webpack · DNS CNAME sigue pendiente

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (app+schema OK; DNS app pendiente) |
| **SHA vivo prod** | `3f860c06eaca` (prod sin redeploy aún) · tip: fix MCP/router track pending push |
| **Deploy fix** | ✅ `SaasMcpProductiveService` + `backend/mcp/**` + `local-ai/router` + PromptBuilder chain tracked · tsc 0 · `build:prod` PASS · sin redeploy aún |
| **Fase 1** | ✅ tsc **0** · honesty+router wiring commit **`80da2def`** pushed |
| **Fase 2** | ✅ ADR-034 · `LlmClient` Ollama-first · `OsCapabilityRegistry` 11 servicios |
| **Fase 3** | ✅ Playbooks `SERVICE_*.md` · sector = legacy satellite (no mint) |
| **Fase 4** | ✅ Partner facade + `NELVYON_CEO_PARTNER_PAYOUTS` gate (default OFF) |
| **Fase 5** | ✅ `docs/OS_AUTONOMOUS_OPERATIONS.md` |
| **IA prod** | **OFF** |
| **Costes nuevos** | **0** |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` |

---

## Próximo paso EXACTO

1. Tras push del fix deploy: esperar Railway build SUCCESS (sin tocar env; redeploy solo si el auto-deploy no dispara).  
2. Humano: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` → health 200.  
3. **No** activar IA prod · **No** `NELVYON_CEO_PARTNER_PAYOUTS` sin auth CEO · **No** OpenAI sin `AUTONOMOUS_ALLOW_OPENAI=1`.

SSOT unificación: `docs/OS_AGENT_TEAM_AUDIT.md` · `docs/OS_AUTONOMOUS_OPERATIONS.md` · ADR-033/034.

---

## Evidencia Fase 1 (cerrada)

| Gate | Resultado |
|------|-----------|
| tsc | **0** |
| vitest honesty+wiring | PASS |
| pack gate | ALL_GATE_PASS 51 |
| commit/push | `80da2def` → `origin/main` |
