# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-09 17:06 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Proyecto** | Nelvyon — agencia IA + SaaS B2B |
| **Último commit** | pendiente commit sesión — migración 494 prod + fix tests |
| **Rama** | `main` (sync with origin) |
| **Prod Web** | `https://nelvyon.com` — git_sha `815e4c0f0e35` |
| **Migración 494** | ✅ **Aplicada en prod** (2026-07-09 17:02 UTC vía `DATABASE_PUBLIC_URL`) |
| **CEO brief cron** | ✅ `processed:1` — workflow `29035626812` (sin `schema_not_ready`) |
| **Migraciones prod** | ✅ 482–511 aplicadas (drift cerrado) |

---

## Último trabajo (sesión 2026-07-09 tarde)

1. Conexión prod DB vía `DATABASE_PUBLIC_URL` (Railway Postgres service).
2. `pnpm -C apps/web exec tsx ../../backend/db/migrate.ts` — aplicó 482–511 incl. **494**.
3. Cron CEO brief verificado: `{"ok":true,"processed":1,"delivered":["email","stored"]}`.
4. Fix tests `saasWorkflowsS30.test.ts` (mock recent-running dedup).
5. Scripts `apply-migration-494.mjs` / `check-migration-494.mjs` corregidos.

---

## Estado Fase 1

| Ítem | Estado |
|------|--------|
| Push + deploy prod | ✅ |
| Migración 494 + tablas CEO brief | ✅ |
| Cron CEO brief operativo | ✅ |
| Migraciones 495–511 prod | ✅ |
| Tests workflow S30 | ✅ |
| CI Elite Gate | 🟡 pendiente re-run |
| Staging en `735dce62` | 🟡 sin redeploy |
| Setup dev local sin commit | 🟡 |

---

## Próximo paso EXACTO

**Push commit pendiente (docs + scripts + tests). Opcional: redeploy staging y re-ejecutar CI gates. Verificar SNS SES subscription (manual AWS).**

---

## Contexto rápido

- Monorepo: `apps/web` = prod; `backend/` = TS + FastAPI.
- Migrar prod manual si `releaseCommand` no aplica drift: `railway service Postgres` → `DATABASE_URL=$DATABASE_PUBLIC_URL pnpm -C apps/web migrate`
- Docs vivos: actualizar `docs/HANDOVER.md` tras cambios importantes.
