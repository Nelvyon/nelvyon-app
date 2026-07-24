# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — Redes sociales integral ADR-052 · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (no READY) |
| **Packs OS** | 11 **IMPLEMENTED_VERIFIED** |
| **Social integral** | ADR-052 · `OsSocialNetworksService` · equipo 10 roles · paid/publish OFF |
| **OpenClaw / Orchestrator / Visual spend** | **PREPARED_OFF** |
| **claimReady** | **false** — **BLOCKED_LEGAL** campañas |
| **Prod IA** | OFF/ABSENT |

### Matriz SSOT

`docs/OS_ELITE_STATE_MATRIX.md` · playbook `SERVICE_CONTENT_SOCIAL.md`

### Rollback

`NELVYON_PAID_SOCIAL_ENABLED=0` · no publish · `NELVYON_VISUAL_GENERATION_ENABLED=0` · `NELVYON_OPENCLAW_BRIDGE_ENABLED=0` · `NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0`

---

## Próximo paso EXACTO

1. **Deploy staging** tip con ADR-052 y ejecutar `node scripts/staging-smoke-beta-packs-e2e.mjs --only=social --skip-wait` (mesh IA ON) → adjuntar evidencia.  
2. **Legal:** checklist campañas (bloquea claimReady / READY).  
3. **CEO:** OpenClaw live / paid social / publish OAuth solo con autorización explícita (hoy **BLOCKED_CEO** / **PREPARED_OFF**).  
4. **No** activar OpenAI/MCP/SM/payouts/campañas/visual spend/paid social en prod.  
5. **No** romper packs certificados.

SSOT: `OS_ELITE_STATE_MATRIX.md` · ADR-052 · `SERVICE_CONTENT_SOCIAL.md`
