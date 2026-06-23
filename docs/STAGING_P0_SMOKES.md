# Staging P0 smokes — quality gate

Gate de calidad para **portal BFF** y los **3 packs autónomos** en staging. No sustituye los unit tests de `apps/web` (`pnpm gate`).

## Scripts P0

| Script | Qué valida |
|--------|------------|
| `scripts/staging-smoke-portal-packs.mjs` | Hubs packs, automatización CEO, shell portal, **login/projects/deliverables vía BFF** |
| `scripts/staging-smoke-local-pack-e2e.mjs` | Kickoff `local-business-growth` → 5 entregables sin mock:// → portal sin operador |
| `scripts/staging-smoke-ecommerce-pack-e2e.mjs` | Kickoff `ecommerce-growth` → 5 entregables sin mock:// → portal sin operador |
| `scripts/staging-smoke-saas-b2b-pack-e2e.mjs` | Kickoff `saas-b2b-growth` → 5 entregables sin mock:// → portal sin operador |
| `scripts/run-staging-p0-smokes.mjs` | Orquestador: ejecuta los 4 smokes y emite `ALL_P0_PASS` o `P0_FAIL` |

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

## SaaS P0 smokes — rutas críticas (Bloques 1-4)

Verificar tras cada deploy que toca `apps/web/src/app/api/saas/` o `apps/web/src/app/saas/`.

### Email tracking (Bloque 2)
| Check | Endpoint | Qué esperar |
|---|---|---|
| Pixel apertura | `GET /api/track/email/open/<token>` | 200 + GIF 43 bytes, `Content-Type: image/gif` |
| Redirect click | `GET /api/track/email/click/<token>` | 302 → URL destino |
| Token inválido | `GET /api/track/email/open/garbage` | 400 |
| SES webhook bounce | `POST /api/webhooks/ses` body SNS bounce | 200 (con `SKIP_SNS_VERIFY=true` en staging) |
| SES webhook confirm | `POST /api/webhooks/ses` body SubscriptionConfirmation | 200 |

### Legacy routes 410 (Bloque 3)
```bash
# Cualquier ruta pages/api/saas/* debe devolver 410
curl -s -o /dev/null -w "%{http_code}" https://STAGING_URL/api/saas/contacts
# → 410
```

### App Router routes 401 sin auth (Bloque 3)
```bash
curl -s -o /dev/null -w "%{http_code}" https://STAGING_URL/api/saas/analytics
# → 401
curl -s -o /dev/null -w "%{http_code}" https://STAGING_URL/api/saas/notifications
# → 401
curl -s -o /dev/null -w "%{http_code}" https://STAGING_URL/api/saas/invoices
# → 401
```

### UI skin dark (Bloque 4)
Manual — verificar en browser que las siguientes rutas renderizan fondo `#020817` (dark) y NO fondo claro:
- `/saas/dashboard`
- `/saas/crm`
- `/saas/campanias`
- `/saas/billing`
- `/saas/workflows`
- `/saas/settings`

---

## Criterio de cierre

- [x] `ALL_P0_PASS` en staging tras deploy de `main` (verificado local post-deploy `31d8ea4`)
- [ ] Workflow `Staging P0 Smokes` verde en GitHub Actions (re-run tras fix wait deploy)
- [x] Flujos portal cliente sin 500 por FastAPI staging en rutas críticas (BFF web)
- [ ] SaaS email tracking: pixel open + click redirect responden correctamente en staging
- [ ] SaaS legacy 410 confirmado en al menos 3 rutas `pages/api/saas/*`
- [ ] SaaS UI dark skin visible en `/saas/dashboard` sin fondo claro
