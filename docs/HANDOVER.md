# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-10 00:19 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Último commit** | `5e9c4134` — `docs(P1): mark stability gate complete — CI green, handover sync` |
| **Rama** | `main` (sync with origin) |
| **Prod** | `https://nelvyon.com` |
| **Staging** | `https://ideal-victory-staging.up.railway.app` |
| **P1** | ✅ **COMPLETADA** (CI verde; SNS SES pendiente CEO) |

---

## P1 — resumen

| Ítem | Estado |
|------|--------|
| Migrate 494 prod + cron CEO brief | ✅ |
| Pack + audit wire + e2e tests | ✅ |
| Web Quality Gates CI | ✅ SUCCESS `29041445107` |
| Staging Elite Gate CI | ✅ SUCCESS `29058208980` |
| `releaseCommand` → `migrate:prod` | ✅ |
| SNS SES subscription | ❌ CEO/AWS (no bloquea código) |

---

## Próximo paso

**Iniciar P2** — flujo dev diario + seed demo local. CEO: confirmar SNS SES en AWS.

---

## Contexto rápido

- `apps/web` = prod Next.js; `backend/` = TS + FastAPI
- Railway rebuild Web solo en `apps/web/**`; `DEPLOY_WAIT_SOFT` en elite gate
- Migrar prod: `DATABASE_URL=$DATABASE_PUBLIC_URL pnpm -C apps/web migrate`
