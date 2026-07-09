# DEPLOYMENTS — Historial de despliegues

> Registrar cada deploy significativo. Actualizado: 2026-07-09

---

## Plantilla

```
## YYYY-MM-DD HH:MM UTC
| Campo | Valor |
| Commit | |
| Rama | |
| Servicio Railway | Web / Python |
| Entorno | production / staging |
| Resultado | success / failed / partial |
| Migraciones aplicadas | |
| Errores | |
| Rollback | sí/no — cómo |
```

---

## 2026-07-09 — Pendiente (no ejecutado desde este entorno)

| Campo | Valor |
|-------|-------|
| **Commit** | `224a0a36` — fix CEO brief cron |
| **Rama** | `main` |
| **Estado** | ⏳ **No pusheado** — deploy pendiente |
| **Objetivo** | Mitigar `42P01` + aplicar migrate 494 en prod |
| **Comando push** | `git push origin main` |
| **Verificación post-deploy** | `POST /api/cron/saas-ceo-brief` + `_migrations` 494 |

---

## Referencia — Proceso deploy Railway Web

1. Push a `main` → Railway build `apps/web/Dockerfile`
2. `releaseCommand`: `pnpm exec tsx ../../backend/db/migrate.ts`
3. Start: `node server.js` (:3000)
4. Health: `/api/health/live`

**Checklist:** `docs/LAUNCH_READY.md`, `docs/RAILWAY_DEPLOY_CHECKLIST.md` (si existe)

---

## Referencia — API Python

1. Build `backend/Dockerfile`
2. `alembic upgrade head && uvicorn main:app`
3. Health: `/health`

---

## Historial anterior

| Fecha | Evento | Fuente |
|-------|--------|--------|
| 2026-07-04 | Hardening Fase 1 código cerrado | `LAUNCH_READY.md` |
| — | Deploys staging documentados | `backend/README.md` |

*Añadir filas aquí tras cada deploy real con fecha/hora/commit/resultado.*
