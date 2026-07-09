# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-10 01:45 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Último commit** | fix CI deploy-wait soft mode (pendiente push) |
| **Rama** | `main` (sync with origin) |
| **Prod** | `https://nelvyon.com` — git_sha `925add03` (Railway no rebuild en pushes scripts-only) |
| **Staging** | `https://ideal-victory-staging.up.railway.app` |
| **P1** | 🟡 Staging Elite Gate re-run post deploy-wait soft fix |

---

## P1 — resumen

| Ítem | Estado |
|------|--------|
| Migrate 494 prod + cron CEO brief | ✅ |
| Pack + audit wire + e2e tests | ✅ |
| Web Quality Gates CI | ✅ SUCCESS `29041445107` (`728f7b08`) |
| Staging Elite Gate CI | 🟡 FAIL deploy SHA timeout → fix `DEPLOY_WAIT_SOFT` |
| `releaseCommand` → `migrate:prod` | ✅ |
| SNS SES subscription | ❌ CEO/AWS |

---

## Próximo paso

Push deploy-wait soft fix → verificar Staging Elite Gate verde → **P1 COMPLETADA**. No iniciar P2.

---

## Contexto rápido

- `apps/web` = prod Next.js; `backend/` = TS + FastAPI
- Railway solo rebuild Web en cambios `apps/web/**`; commits scripts/CI no actualizan git_sha prod
- Migrar prod: `DATABASE_URL=$DATABASE_PUBLIC_URL pnpm -C apps/web migrate`
