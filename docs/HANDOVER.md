# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-09 18:17 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Último commit** | `4c4112bd` + fix e2e `launch.spec.ts` pendiente push |
| **Rama** | `main` (sync with origin) |
| **Prod** | `https://nelvyon.com` |
| **Staging** | `https://ideal-victory-staging.up.railway.app` |
| **P1** | ✅ cerrada en código; CI Web Quality Gates pendiente re-run post-fix e2e |

---

## P1 — resumen

| Ítem | Estado |
|------|--------|
| Migrate 494 prod + cron CEO brief | ✅ |
| Pack tests (`packSeedMetadata`, `packAutoApprove`) | ✅ |
| `run-local-elite-reinforce` | ✅ ALL_PASS |
| `pnpm gate` + `pnpm build` | ✅ |
| `releaseCommand` → `migrate:prod` + Dockerfile | ✅ |
| Dev setup commiteado | ✅ |
| Staging Elite Gate CI | ✅ SUCCESS run `29039024932` |
| Web Quality Gates CI | 🟡 fix e2e certificados → 401 (commit pendiente) |
| SNS SES subscription | ❌ CEO/AWS |

---

## Próximo paso

Push fix e2e → verificar Web Quality Gates verde. Luego iniciar P2.

---

## Contexto rápido

- `apps/web` = prod Next.js; `backend/` = TS + FastAPI
- Migrar prod: `DATABASE_URL=$DATABASE_PUBLIC_URL pnpm -C apps/web migrate`
