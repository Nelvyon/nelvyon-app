# LAUNCH CHECKLIST DEFINITIVE — NELVYON

> **Actualizado:** 2026-07-29 · **claimReady: false** · canary **KILL ON** · **NOT READY** para declarar lanzamiento comercial  
> SSOT ops: [`ops/OPERATIONS_INDEX.md`](./ops/OPERATIONS_INDEX.md) · Estado: [`HANDOVER.md`](./HANDOVER.md)  
> Este checklist **no** autoriza prod. Cada casilla prod requiere SÍ CEO o cuenta externa.

Marca solo lo **verificado**. No marcar por intención.

---

## 0. Gates globales (antes de cualquier entorno)

| Gate | Criterio | Estado tipico |
|------|----------|---------------|
| Tip limpio | Tip documentado en HANDOVER | Ver HANDOVER |
| Typecheck | `pnpm -C apps/web exec tsc --noEmit` → 0 | Repo |
| Tests | Vitest SaaS/email/billing/crm/security PASS | Repo |
| Lint | `pnpm -C apps/web lint` → 0 | Repo |
| Migraciones tip | Última mig documentada en `DATABASE.md` | Repo |
| `claimReady` | **false** hasta criterios de producto | **false** |
| Canary IA | KILL ON en prod | **KILL ON** |

---

## 1. Staging

### Pre-deploy

- [ ] Variables críticas staging (`JWT_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`)
- [ ] `SES_REGION` alineada (`eu-west-1` si aplica)
- [ ] Tip a desplegar = tip de HANDOVER (o documentar divergencia)
- [ ] No hay soak MCP/Router competidor activo que invalidar

### Deploy

- [ ] Push / redeploy Railway staging SUCCESS
- [ ] Deploy id anotado en `DEPLOYMENTS.md`
- [ ] Migraciones aplicadas o confirmadas skip (521/522 staging: applied)

### Validación staging

- [ ] `GET /api/health/live` → 200
- [ ] `GET /api/health/ready` → 200 + env OK
- [ ] Login SaaS + CRM list/create smoke
- [ ] Workflows honesty / create (según scripts vigentes)
- [ ] Secuencias / Playwright smoke si el tip toca sequences
- [ ] `node scripts/run-staging-p0-smokes.mjs --skip-wait` (o equivalente documentado)
- [ ] Yellow-queue / honesty si aplica al tip

### Monitorización staging (post)

- [ ] Logs Railway sin error storm 15–30 min
- [ ] Cron staging (si configurado) responde 200 con `CRON_SECRET`

---

## 2. Producción (solo con autorización CEO)

### Pre-prod (READ-ONLY permitido sin SÍ migrate)

- [ ] Leer `ops/PROD_MIGRATE_521_522_RUNBOOK.md`
- [ ] Confirmar `SAFE_TO_MIGRATE_PROD` técnico en HANDOVER
- [ ] Backup CI / `DATABASE_PUBLIC_URL` operativo
- [ ] Inventario secretos vs `PRODUCTION_SECRETS.md`
- [ ] Canary flags = KILL (no abrir en este paso)
- [ ] SNS/SES / Stripe webhooks revisados (cuentas AWS/Stripe)

### Migrate (SÍ CEO + ADR-064)

- [ ] `NELVYON_PROD_MIGRATE_APPROVED=1` + `APPROVED_BY`
- [ ] Orden: migrate 521 → validate → 522 → validate
- [ ] Evidencia registrada (no inventar)

### Deploy prod (SÍ CEO tras migrate si tip lo requiere)

- [ ] `SAFE_TO_DEPLOY_PROD` = true en HANDOVER **antes** de desplegar
- [ ] Deploy SUCCESS `@nelvyon/web`
- [ ] Tip live = tip esperado
- [ ] **No** activar canary en el mismo cambio salvo decisión separada

### Validación producción

- [ ] `/api/health/live` 200
- [ ] `/api/health/ready` 200
- [ ] `/api/health/deep` 200 con `CRON_SECRET`
- [ ] Login SaaS prod
- [ ] Billing resumen (sin cobro de prueba no autorizado)
- [ ] Campañas: `ses_configured` coherente (sin mass-send)
- [ ] Webhook Stripe test event (Dashboard) si CEO autoriza
- [ ] Cron smoke: `POST /api/cron/saas-workflows` con Bearer

---

## 3. Post-deploy (staging o prod)

- [ ] Entrada en `DEPLOYMENTS.md` (tip, deploy id, env, resultado)
- [ ] Actualizar `HANDOVER.md` (próximo paso EXACTO no vacío)
- [ ] Entrada `CHANGELOG.md` si el tip es material
- [ ] Confirmar kill switches IA intactos en prod
- [ ] Sin `claimReady: true` salvo decisión explícita de producto

---

## 4. Monitorización continua (ops diaria / semanal)

| Señal | Dónde | Acción si falla |
|-------|-------|-----------------|
| Health live/ready | URL env | P0/P1 runbook |
| Deep health | `CRON_SECRET` | Revisar DB/Redis/SES/Stripe |
| Logs stdout | Railway | Correlacionar `requestId` |
| Sentry (si DSN) | Proyecto Sentry | Triage errores nuevos |
| Status page | `/status` | Cron `status-check` |
| Backups | GH `db-backup.yml` | Verificar artifact semanal |
| Crons | `production-cron.yml` | Fallos → secret sync |

**Alertas pagadas:** no desplegadas. Reglas Prometheus en repo para FastAPI: `backend/ops/alerts/phase9_alerts.yaml` — scrape real = ops externo / coste.

Alert simulation local: `backend/agency/OpsObservabilityCore.ts` (no paging).

---

## 5. Validación funcional mínima (smoke mental)

| Superficie | Check mínimo |
|------------|--------------|
| Auth | Login + cookie httpOnly |
| CRM | List + create contacto |
| Workflows | List / create (staging) |
| Billing | GET resumen plan |
| Email | `ses_configured` flag (no send masivo) |
| Portal | Login portal si tip lo toca |
| OS packs | Solo si kickoff autorizado |

---

## 6. Rollback (checklist rápido)

- [ ] Identificar si es flag o código
- [ ] Aplicar kill switch o redeploy tip bueno
- [ ] Health verde
- [ ] Congelar sends / canary si aplica
- [ ] Documentar en KNOWN_ISSUES si P0/P1
- [ ] **No** revertir mig con `DOWN` improvisado — restore drill

Detalle: [`ops/WORLD_CLASS_OPS_RUNBOOK.md`](./ops/WORLD_CLASS_OPS_RUNBOOK.md) § Rollback.

---

## 7. Lo que bloquea “READY” comercial (honesto)

| Bloqueo | Dueño |
|---------|-------|
| Mig 521–522 prod | CEO SÍ + ops |
| Deploy tip actual a prod | Tras migrate |
| Canary IA | CEO SÍ separado · hoy KILL |
| SES production access / primer envío real | AWS + CEO |
| OAuth Ads/Social/Twilio live | Cuentas externas + CEO |
| `claimReady: true` | Decisión producto explícita |

Hasta entonces: operar staging con excelencia; prod en modo **gated**.
