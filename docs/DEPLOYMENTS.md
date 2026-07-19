# DEPLOYMENTS — Historial de despliegues

> Registrar cada deploy significativo. Actualizado: **2026-07-19**

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

## 2026-07-19 — Final Elite repo closure (código)

| Campo | Valor |
|-------|-------|
| **Alcance** | Security headers SSOT · migrate-pg splitter · SEO OG/sitemap/robots/schema · CI cleanup · Workforce PASS intacto |
| **Evidencia** | `tsc` OK · securityHeaders tests · validate-post-elite 508–514 · `workforce_certification.json` PASS |
| **Deploy prod** | **No ejecutado desde agente** — requiere Railway/CEO |
| **Pendiente ops** | SES production · Stripe prod · mig 514 staging · Cloudflare |

---

## 2026-07-10 — P3/P4 Fase 1 cierre técnico

| Campo | Valor |
|-------|-------|
| **Alcance** | optimizePackageImports, pnpm overrides, security-gates, Dependabot, backup fail-fast, CEO checklist |
| **Auditoría local** | `PHASE1_AUDIT_PASS`, build OK, 0 critical audit |
| **Docs** | HANDOVER, TODO, PROJECT_STATUS, CEO_FINAL_ACTIONS |
| **CEO pendiente** | `docs/CEO_FINAL_ACTIONS.md` |

---

## 2026-07-10 — P2 Ops enterprise

| Campo | Valor |
|-------|-------|
| **Alcance** | env validation, statusChecker, ops API, crons, backup workflow, log rotation |
| **Docs** | `docs/OPS.md` |
| **CEO pendiente** | GitHub secret `DATABASE_URL` para backup prod |

---

## 2026-07-10 — Staging Elite Gate SUCCESS

| Campo | Valor |
|-------|-------|
| **Run CI** | `29058208980` |
| **Commit** | `9937fb10` — deploy-wait soft mode |
| **Resultado** | ✅ ALL_ELITE_GATE_PASS |

---

## 2026-07-09 — Staging redeploy (BUILDING)

| Campo | Valor |
|-------|-------|
| **Servicio** | `ideal-victory` (staging) |
| **Deployment** | `1231b981` BUILDING |
| **Trigger** | `railway redeploy` post-P1 |

---

## 2026-07-09 12:41 UTC — Producción Web (SUCCESS)

| Campo | Valor |
|-------|-------|
| **Deployment ID** | `5c2be62e-891f-484f-9fed-78bb6f5fc0c2` |
| **Commit** | `815e4c0f` — docs + incluye `224a0a36` CEO brief fix |
| **Rama** | `main` |
| **Servicio** | Railway `@nelvyon/web` (proyecto `truthful-respect`, production) |
| **URL** | `https://nelvyon.com` |
| **Resultado** | ✅ SUCCESS |
| **Health post-deploy** | `GET /api/health/live` → `{"ok":true,"git_sha":"815e4c0f0e35"}` |
| **releaseCommand** | `pnpm exec tsx ../../backend/db/migrate.ts` (configurado; logs migrate no visibles en runtime logs) |
| **Migraciones** | ✅ 494 + 482–511 aplicadas manualmente 2026-07-09 17:02 UTC |
| **Errores runtime** | Ninguno crítico en logs de arranque (`Ready on http://0.0.0.0:3000`) |
| **Rollback** | No |

**Trigger:** push `git push origin main` (commits `224a0a36`, `815e4c0f`).

**Deploy anterior:** `9e4c9c05` SUCCESS 2026-07-07 — commit `735dce62`.

---

## Referencia — Proceso deploy Railway Web

1. Push a `main` → Railway build `apps/web/Dockerfile`
2. `releaseCommand`: `pnpm exec tsx ../../backend/db/migrate.ts`
3. Start: `node server.js` (:3000)
4. Health: `/api/health/live`

**Checklist:** `docs/LAUNCH_READY.md`, `docs/RAILWAY_DEPLOY_CHECKLIST.md`

---

## Referencia — API Python

1. Build `backend/Dockerfile`
2. `alembic upgrade head && uvicorn main:app`
3. Health: `/health`
4. URL prod: `https://nelvyon-app-production.up.railway.app`

---

## Historial anterior

| Fecha | Evento | Fuente |
|-------|--------|--------|
| 2026-07-07 | Deploy prod `735dce62` | Railway deployment `9e4c9c05` |
| 2026-07-04 | Hardening Fase 1 código cerrado | `LAUNCH_READY.md` |
| — | Deploys staging documentados | `backend/README.md` |
