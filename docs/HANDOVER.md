# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-09 18:58 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Último commit** | `728f7b08` — audit wire mocks; deploy-wait fix pendiente push |
| **Rama** | `main` (sync with origin) |
| **Prod** | `https://nelvyon.com` |
| **Staging** | `https://ideal-victory-staging.up.railway.app` |
| **P1** | 🟡 Staging Elite Gate re-run post deploy-wait timeout fix |

---

## P1 — resumen

| Ítem | Estado |
|------|--------|
| Migrate 494 prod + cron CEO brief | ✅ |
| Pack + audit wire + e2e tests | ✅ |
| Web Quality Gates CI | ✅ SUCCESS `29041445107` |
| Staging Elite Gate CI | 🟡 FAIL deploy SHA timeout → fix `DEPLOY_WAIT_MAX_ATTEMPTS=120` |
| `releaseCommand` → `migrate:prod` | ✅ |
| SNS SES subscription | ❌ CEO/AWS |

---

## Próximo paso

Push deploy-wait fix → re-run Staging Elite Gate. Si verde → **P1 COMPLETADA**. No iniciar P2.

---

## Contexto rápido

- `apps/web` = prod Next.js; `backend/` = TS + FastAPI
- Migrar prod: `DATABASE_URL=$DATABASE_PUBLIC_URL pnpm -C apps/web migrate`
