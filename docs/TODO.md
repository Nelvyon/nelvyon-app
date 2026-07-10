# TODO — NELVYON

> Actualizado: **2026-07-10** (P3/P4 completadas; Fase 1 técnicamente cerrada)

---

## P0 — Bloqueantes producción

- [x] Completado y validado 2026-07-10

---

## P1 — Estabilidad y CI

- [x] Completado y validado 2026-07-10

---

## P2 — Operación enterprise

- [x] Health checks + Railway healthcheckPath
- [x] Prod env validation (`prodEnvValidation.ts`)
- [x] Status monitoring (statusChecker + cron status-check)
- [x] Ops summary API + cron/webhook registry
- [x] Crons en production-cron.yml
- [x] Log rotation Python
- [x] Backup GH Action + SQLite verify CI
- [x] Documentación OPS / INFRASTRUCTURE
- [ ] CEO: `DATABASE_URL` secret GitHub (backup prod) — ver `CEO_FINAL_ACTIONS.md` §1
- [ ] CEO: SNS SES subscription (KI-011) — ver `CEO_FINAL_ACTIONS.md` §4

---

## P3 — Consolidación, rendimiento y deuda técnica

- [x] Bundle: `optimizePackageImports` en `next.config.ts`
- [x] Overrides seguridad `ws`, `axios`, `vitest` → `pnpm-workspace.yaml`
- [x] Validador migraciones post-elite 508–511
- [x] Script `run-phase1-audit.mjs`
- [x] Regresión P0–P2: typecheck, lint, elite reinforce — PASS
- [x] Build producción — PASS

---

## P4 — Hardening y cierre Fase 1

- [x] Workflow `security-gates.yml` (audit critical, Gitleaks, migrations)
- [x] Dependabot semanal
- [x] Backup fail-fast si falta `DATABASE_URL` en schedule
- [x] Checklist CEO consolidado (`docs/CEO_FINAL_ACTIONS.md`)
- [x] Documentación viva actualizada
- [ ] CEO: acciones manuales §1–8 en `CEO_FINAL_ACTIONS.md`

---

## Fase 2 — IA (NO INICIAR)

- [ ] Activar provider LLM — **fuera de alcance hasta cierre CEO Fase 1**
