# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-09 17:58 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Último commit** | pendiente push sesión P1 |
| **Rama** | `main` (sync with origin) |
| **Prod Web** | `https://nelvyon.com` |
| **Staging Web** | `https://ideal-victory-staging.up.railway.app` — redeploy iniciado |
| **Migración 494** | ✅ prod |
| **CEO brief cron** | ✅ `processed:1` |
| **CI local** | ✅ gate + elite reinforce + build |

---

## P1 completado (2026-07-09)

1. Tests pack orchestrator corregidos (`createPackRun` mock `{ run, created: true }`).
2. `run-local-elite-reinforce` — ALL_PASS (215 pack tests).
3. `pnpm gate` — 2762 tests smoke OK.
4. `pnpm build` — OK.
5. `releaseCommand` unificado → `pnpm migrate:prod`; Dockerfile incluye `scripts/`.
6. Setup dev local commiteado (`config.py`, `load_env_files.py`, README).
7. Staging redeploy disparado (`ideal-victory`).

---

## Próximo paso

Verificar CI GitHub post-push y health staging con git_sha nuevo. SNS SES subscription (CEO/AWS).

---

## Contexto rápido

- Monorepo: `apps/web` = prod; `backend/` = TS + FastAPI.
- Migrar prod: `DATABASE_URL=$DATABASE_PUBLIC_URL pnpm -C apps/web migrate`
- Docs vivos: actualizar tras cambios importantes.
