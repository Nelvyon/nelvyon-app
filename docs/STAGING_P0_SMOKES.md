# Staging P0 smokes — quality gate

Gate de calidad para **portal BFF** y **pack Local** en staging. No sustituye los unit tests de `apps/web` (`pnpm gate`).

## Scripts P0

| Script | Qué valida |
|--------|------------|
| `scripts/staging-smoke-portal-packs.mjs` | Hubs packs, automatización CEO, shell portal, **login/projects/deliverables vía BFF** |
| `scripts/staging-smoke-local-pack-e2e.mjs` | Kickoff Local → assets live → invite → accept → login → 5 entregables → **me/projects/approve/reject/download BFF** |
| `scripts/run-staging-p0-smokes.mjs` | Orquestador: ejecuta ambos y emite `ALL_P0_PASS` o `P0_FAIL` |

## Ejecución local

```bash
node scripts/run-staging-p0-smokes.mjs
# Sin espera de deploy:
node scripts/run-staging-p0-smokes.mjs --skip-wait
```

Credenciales QA (staging): operador `qa-audit-20260612@nelvyon.test` — ver `backend/README.md`.

## CI

Workflow: `.github/workflows/staging-smoke-p0.yml`

- **Trigger:** push a `main` (paths `apps/web`, smokes) + `workflow_dispatch`
- **Flujo:** `wait-staging-p0-deploy.mjs` (falla si BFF no listo) → `run-staging-p0-smokes.mjs --skip-wait`
- **Resultado:** job verde = `ALL_P0_PASS`; rojo = `P0_FAIL` o `CRITICAL_FAILS` en algún smoke

## Portal BFF (web, no FastAPI)

Rutas críticas del cliente:

| Método | Ruta |
|--------|------|
| POST | `/api/platform/portal/auth/login` |
| POST | `/api/platform/portal/auth/accept-invite` |
| GET | `/api/platform/portal/me` |
| GET | `/api/platform/portal/projects` |
| GET | `/api/platform/portal/projects/:id` |
| GET | `/api/platform/portal/deliverables` |
| GET | `/api/platform/portal/deliverables/:id` |
| POST | `/api/platform/portal/deliverables/:id/approve` |
| POST | `/api/platform/portal/deliverables/:id/reject` |
| GET | `/api/platform/portal/deliverables/:id/download` |

Operador (invite):

| Método | Ruta |
|--------|------|
| POST/GET | `/api/platform/portal/invites` |

El proxy `/api/v1/portal/*` permanece como compatibilidad; la UI del portal usa el BFF web.

## Criterio de cierre

- [x] `ALL_P0_PASS` en staging tras deploy de `main` (verificado local post-deploy `31d8ea4`)
- [ ] Workflow `Staging P0 Smokes` verde en GitHub Actions (re-run tras fix wait deploy)
- [x] Flujos portal cliente sin 500 por FastAPI staging en rutas críticas (BFF web)
