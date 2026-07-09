# CHANGELOG — Documentación y cambios registrados

> Historial acumulativo. No eliminar entradas.

---

## 2026-07-09

| Hora (aprox) | Archivo / área | Cambio | Descripción |
|--------------|----------------|--------|-------------|
| 17:02 | Postgres prod | Migrate | 482–511 vía `DATABASE_PUBLIC_URL`; **494 aplicada** |
| 17:02 | Cron CEO brief | Verificado | `processed:1`, email+stored; run `29035626812` |
| 18:55 | CI Web Quality Gates | SUCCESS | run `29041445107` commit `728f7b08` |
| 18:55 | CI Staging Elite Gate | FAIL | deploy SHA timeout — fix `DEPLOY_WAIT_MAX_ATTEMPTS` |
| 20:15 | `e2e/launch.spec.ts` | Fix | `/api/saas/certificados` es API real (401), no stub 410 |
| 19:53 | CI local | PASS | `run-local-elite-reinforce` 215 pack tests |
| 19:52 | Pack tests | Fix | `packAutoApprove` + `packSeedMetadata` mocks |
| 19:52 | Infra | Fix | `releaseCommand` → `migrate:prod`; Dockerfile scripts |
| 17:00 | `scripts/apply-migration-494.mjs` | Creado | Utilidad apply+verify migración 494 |
| 15:00 | `docs/*` | Actualizado | Post-deploy autónomo |
| 14:52 | Railway prod | Deploy | `@nelvyon/web` deploy `5c2be62e` SUCCESS — git_sha `815e4c0f` |
| 14:41 | `origin/main` | Push | `git push origin main` — commits `224a0a36`, `815e4c0f` |
| 14:30 | `scripts/check-*.mjs` | Creado | Utilidades verificación migración 494 y cron CEO brief |
| 14:30 | `docs/*` | Creado | Sistema documentación viva (14 archivos + regla Cursor) |
| 14:06 | `backend/saas/SaasCeoBriefService.ts` | Modificado | Manejo `42P01` en CEO brief |
| 14:06 | `apps/web/src/app/api/cron/saas-ceo-brief/route.ts` | Modificado | Respuesta `schema_not_ready` sin crash |
| 14:06 | `backend/saas/__tests__/SaasCeoBriefService.test.ts` | Creado | 3 tests schema drift |
| — | commit `224a0a36` | Commit | `fix: handle saas ceo brief settings table in production` |

## 2026-07-07 / 08

| Hora | Archivo | Cambio | Descripción |
|------|---------|--------|-------------|
| — | `backend/core/config.py` | Modificado | Pydantic fields + `load_env_files()` antes de Settings |
| — | `backend/db/load_env_files.py` | Modificado | Carga `backend/.env` |
| — | `.env` | Creado | Dev local SQLite + JWT (gitignored) |
| — | `frontend/.env.development.local` | Creado | Proxy 127.0.0.1:8000 |
| — | `README-dev-Windows.md` | Modificado | Rutas monorepo actuales |
| — | `backend/README.md` | Modificado | Placeholder credencial Supabase |

## 2026-07-04

| Archivo | Cambio | Descripción |
|---------|--------|-------------|
| `docs/LAUNCH_READY.md` | Actualizado | Cierre hardening Fase 1 producción |

---

## Plantilla nuevas entradas

```
## YYYY-MM-DD
| Hora | Archivo | Cambio | Descripción |
```

**Regla:** cualquier agente/humano que modifique código importante añade una fila aquí antes de cerrar la tarea.
