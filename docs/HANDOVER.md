# HANDOVER — NELVYON

> **Lee este archivo primero.**  
> Última actualización: **2026-07-20** — Sprint final absoluto · **CONDITIONAL_READY**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** — gates locales verdes; go-live bloqueado por ops externas |
| **Workforce / Elite** | **PASS** · freezes intactos |
| **QA local** | `tsc` OK · lint OK · build OK · vitest **2431 passed / 6 skipped** · mig **508–515** OK |
| **Brain** | orphans **0** · coverage **0.95** · `claimComplete` **false** · ingest `verified:false` (Docker DOWN) |
| **Última mig** | `515_shared_memory_rls.sql` (411 archivos) |
| **Informe** | `docs/SPRINT_FINAL_ABSOLUTO.md` |

---

## Próximo paso EXACTO (solo humano / infra)

1. Arrancar Docker Desktop → `docker compose -f backend/local-ai/docker-compose.yml up -d` → `node scripts/preflight-local-ai-ingest.mjs` → `$env:NELVYON_KNOWLEDGE_INGEST="1"; node scripts/nelvyon-knowledge-sync.mjs`  
2. Staging: `$env:DATABASE_URL="…"; pnpm -C apps/web migrate; node scripts/verify-shared-memory-schema.mjs`  
3. SES production access (`docs/OPS_SES_PROD.md`) + Stripe live (`docs/OPS_STRIPE_PROD.md`)  
4. Railway deploy + Cloudflare DNS/WAF + `NELVYON_OPENCLAW_BRIDGE_URL` si aplica  

---

## Evidencia local

```powershell
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web lint
pnpm -C apps/web build
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm backend/db --reporter=dot
node scripts/validate-post-elite-migrations.mjs
node scripts/nelvyon-knowledge-sync.mjs
```
