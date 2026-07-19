# HANDOVER — NELVYON

> **Lee este archivo primero.**  
> Última actualización: **2026-07-19** — Brain: classify/archive orphans + agent domains; gap 0.65; ingest blocked (Docker)

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Workforce / Elite** | **PASS** · no romper freezes |
| **Brain knowledge** | Manifest **217** · unique **192** · `coverageRatioEstimate` **0.65** · `claimComplete` **false** · orphans **86** · archived **49** · ingest `verified:false` (Docker down) |
| **Informe brain** | `docs/NELVYON_BRAIN_KNOWLEDGE.md` |
| **Prod email** | **Bloqueado** KI-014 SES production access |
| **Freeze** | Router / MCP / Specialization / Elite / Workforce |

---

## Próximo paso EXACTO

1. Arrancar Docker Desktop + `docker compose -f backend/local-ai/docker-compose.yml up -d`
2. Con local-ai Postgres UP: `NELVYON_KNOWLEDGE_INGEST=1 node scripts/nelvyon-knowledge-sync.mjs` y confirmar `knowledge_ingest_evidence.json` → `verified:true`
3. Reducir los **86** orphans restantes (mapear dominio o archivar; no indexar basura)
4. Ops externos: SES / Stripe / mig 514 staging / Cloudflare (sin cambio de código)


## Evidencia

```powershell
node scripts/nelvyon-knowledge-sync.mjs
pnpm -C apps/web exec vitest run backend/saas/__tests__/nelvyonBrainKnowledge.test.ts --reporter=dot
```

Informes: `docs/NELVYON_BRAIN_KNOWLEDGE.md` · `docs/FINAL_ELITE_CLOSURE.md`
