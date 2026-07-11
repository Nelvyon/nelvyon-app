# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización: **2026-07-11 18:05 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Fase 1 ops** | ⏳ Solo bloquea apelación SES AWS (CEO) |
| **Fase 2 IA local** | ✅ **Base validada en ejecución real** (Docker + pgvector + RLS + backup) |
| **Último commit** | Phase 2 local stack validation |

---

## Fase 2 — IA privada local

**Validado en máquina propietario (2026-07-11):**
- `local-ai-up` + `migrate` + health OK
- Integración 8/8 (RLS memoria + RAG)
- `local-ai-validate.mjs` 7/7 (persistencia, backup cifrado, restore temp DB, localhost bind, PRIVATE_MODE)
- Rol app `nelvyon_local_app` (NOBYPASSRLS) + FORCE ROW LEVEL SECURITY

**Propietario debe (siguiente fase):**
1. Instalar **Ollama** + benchmark modelos 3B (ver hardware audit)
2. **No** construir 22 agentes hasta router + modelos elegidos

---

## Fase 1 — bloqueante restante

**SES Production Access** → `docs/SES_PRODUCTION_ACCESS_APPEAL.md` §3

---

## Comandos Fase 2

```bash
node scripts/hardware-audit.mjs
node scripts/local-ai-up.mjs
node scripts/local-ai-migrate.mjs
pnpm -C apps/web exec tsx ../../scripts/local-ai-health.ts
node scripts/local-ai-validate.mjs
RUN_LOCAL_AI_INTEGRATION=1 pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiPhase2.test.ts
```

---

## Contexto

- IA local: `backend/local-ai/README.md`
- Privacidad: `docs/PHASE2_SECURITY_MODEL.md`
- SES appeal: `docs/SES_PRODUCTION_ACCESS_APPEAL.md`
