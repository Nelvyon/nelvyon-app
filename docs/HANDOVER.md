# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-09 18:40 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Último commit** | fix audit wire mocks + docs (pendiente push) |
| **Rama** | `main` |
| **Prod** | `https://nelvyon.com` |
| **Staging** | `https://ideal-victory-staging.up.railway.app` |
| **P1** | 🟡 CI Web Quality Gates re-run post-fix `saasI18nAuditWireS34` |

---

## P1 — resumen

| Ítem | Estado |
|------|--------|
| Migrate 494 prod + cron CEO brief | ✅ |
| Pack tests (`packSeedMetadata`, `packAutoApprove`) | ✅ |
| E2E `launch.spec.ts` certificados → 401 | ✅ commit `925add03` |
| Audit wire regression mocks | ✅ fix local |
| `run-local-elite-reinforce` + `pnpm gate` + build | ✅ |
| `releaseCommand` → `migrate:prod` + Dockerfile | ✅ |
| Staging Elite Gate CI | ✅ SUCCESS run `29040141156` |
| Web Quality Gates CI | 🟡 re-run pendiente (falló run `29040141325` en full regression) |
| SNS SES subscription | ❌ CEO/AWS |

---

## Próximo paso

Verificar Web Quality Gates verde tras push fix audit mocks. Si verde → **P1 COMPLETADA** (salvo SNS CEO). No iniciar P2.

---

## Contexto rápido

- `apps/web` = prod Next.js; `backend/` = TS + FastAPI
- Migrar prod: `DATABASE_URL=$DATABASE_PUBLIC_URL pnpm -C apps/web migrate`
