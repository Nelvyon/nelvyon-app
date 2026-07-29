# WORLD-CLASS OPS RUNBOOK — NELVYON

> **Actualizado:** 2026-07-29 · **claimReady: false** · canary **KILL ON** · **0€** (sin vendors nuevos)  
> Índice: [`OPERATIONS_INDEX.md`](./OPERATIONS_INDEX.md) · Estado vivo: [`../HANDOVER.md`](../HANDOVER.md)

Este documento unifica **despliegue, rollback y recuperación por tipo de fallo**.  
Los procedimientos largos viven en runbooks enlazados; aquí está el **árbol de decisión operativo**.

---

## 0. Severidad (igual que incidencias)

| Sev | Criterio | Primer reflejo |
|-----|----------|----------------|
| **P0** | Outage total / riesgo de datos / auth roto | Health → flags kill → no migrate |
| **P1** | Módulo core caído (email send, billing webhook, CRM write) | Aislar módulo · flag OFF |
| **P2** | Degradación parcial | Correlacionar `requestId` · deploy reciente |
| **P3** | Cosmético | Backlog |

Detalle: [`INCIDENT_RUNBOOK.md`](./INCIDENT_RUNBOOK.md).

---

## 1. Despliegue

### Staging (seguro / default)

1. Tip en `main` limpio · `pnpm -C apps/web exec tsc --noEmit` · vitest suite SaaS.
2. Push → Railway staging auto-deploy (`ideal-victory` — ver [`../ENVIRONMENTS.md`](../ENVIRONMENTS.md)).
3. Esperar deploy SUCCESS · anotar deploy id en [`../DEPLOYMENTS.md`](../DEPLOYMENTS.md).
4. Validar:
   - `GET /api/health/live` → 200
   - `GET /api/health/ready` → 200 + `env.ok`
   - Smokes: `node scripts/run-staging-p0-smokes.mjs --skip-wait` (si aplica)
5. Migraciones: staging suele aplicar vía `releaseCommand`. Confirmar tip mig en [`../DATABASE.md`](../DATABASE.md).

### Producción (gated — **no ejecutar sin SÍ CEO**)

1. Leer [`PROD_MIGRATE_521_522_RUNBOOK.md`](./PROD_MIGRATE_521_522_RUNBOOK.md) si hay migs pendientes.
2. Orden canónico cuando hay schema drift: **migrate → validate → deploy** (nunca al revés si el tip necesita columnas nuevas).
3. Checklist env: [`../RAILWAY_DEPLOY_CHECKLIST.md`](../RAILWAY_DEPLOY_CHECKLIST.md) + [`../PRODUCTION_SECRETS.md`](../PRODUCTION_SECRETS.md).
4. Post-deploy: sección 3 de [`../LAUNCH_CHECKLIST_DEFINITIVE.md`](../LAUNCH_CHECKLIST_DEFINITIVE.md).

**Estado actual (honesto):** `SAFE_TO_DEPLOY_PROD = false` hasta migrate 521–522 · ver HANDOVER.

---

## 2. Rollback

Preferencia (de más rápido a más invasivo):

| Orden | Acción | Cuándo |
|-------|--------|--------|
| 1 | **Flag / kill switch** | Incidente por feature (IA, autonomous, mass-send) |
| 2 | **Redeploy tip conocido-bueno** | Regression de código sin mig irreversible |
| 3 | **Railway rollback** al deploy anterior SUCCESS | Deploy malo, schema compatible |
| 4 | **DB restore drill → restore** | Corrupción / mig destructiva | Solo tras drill no-prod |

### Kill switches IA (prod — mantener KILL)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

Fuente: [`CANARY_IA_FLAGS.md`](./CANARY_IA_FLAGS.md).

### Rollback deploy (Railway)

1. Identificar último deploy SUCCESS con health verde (historial: [`../DEPLOYMENTS.md`](../DEPLOYMENTS.md)).
2. Redeploy ese commit o `railway rollback` en el servicio `@nelvyon/web`.
3. Verificar `/api/health/live` + `/api/health/ready` **antes** de declarar cerrado.
4. **Nunca** auto-rollback una migración aplicada — seguir [`POSTGRES_RESTORE_DRILL.md`](./POSTGRES_RESTORE_DRILL.md).

Checklist estructurado: `HA_DR_ROLLBACK_CHECKLIST` en `backend/agency/HaDrReadiness.ts` · [`HA_DR_SCALE_RUNBOOK.md`](./HA_DR_SCALE_RUNBOOK.md).

---

## 3. Recuperación de incidencias (primeros 5 minutos)

1. `GET /api/health/deep` (auth `CRON_SECRET`) en el entorno afectado.
2. Tomar `x-request-id` del cliente o logs Railway; correlacionar con `requestId` en body de error SaaS (`saasErrorBody`).
3. ¿Deploy/flag en la ventana? → preferir rollback de flag.
4. Registrar nota con correlación en [`../KNOWN_ISSUES.md`](../KNOWN_ISSUES.md) si P0/P1.
5. Escalada CEO/ops por canal existente (sin tool de pago nuevo).

---

## 4. Por tipo de fallo

### 4.1 Fallo Railway (app / deploy)

| Síntoma | Acción |
|---------|--------|
| Deploy FAILED / SKIPPED | Logs build · tip limpio · redeploy from source |
| 502/timeouts | Health live/ready · restart servicio · comprobar cuota |
| Variables rotas post-deploy | Comparar con [`../PRODUCTION_SECRETS.md`](../PRODUCTION_SECRETS.md) · `/api/health/ready` |
| Accidental `railway down` | Redeploy from last SUCCESS (histórico 2026-07-28) |

No crear servicios nuevos. No tocar prod sin autorización.

### 4.2 Fallo Supabase / Postgres

| Síntoma | Acción |
|---------|--------|
| `ready` falla DB | Comprobar `DATABASE_URL` (service_role / Railway Postgres — **nunca** anon) |
| `42P01` / `SCHEMA_MISMATCH` | Tip mig ausente → runbook migrate gated; API responde 503 opaco |
| RLS bloquea writes | Ver [`../DATABASE.md`](../DATABASE.md) · [`../OS_RLS_AUDIT.md`](../OS_RLS_AUDIT.md) — no desactivar RLS en prod |
| Corrupción / pérdida | Backup CI → drill no-prod → restore · [`POSTGRES_RESTORE_DRILL.md`](./POSTGRES_RESTORE_DRILL.md) |

**RPO ≤ 24h / RTO ≤ 4h** (objetivos ops, no SLA comercial): [`HA_DR_SCALE_RUNBOOK.md`](./HA_DR_SCALE_RUNBOOK.md).  
Backup: `.github/workflows/db-backup.yml` requiere `DATABASE_PUBLIC_URL`.

### 4.3 Fallo IA (Private AI / Router / RAG)

| Síntoma | Acción |
|---------|--------|
| Inference 403/404 | Esperado con KILL ON — **no** reabrir canary sin SÍ CEO |
| Timeout / ECONNREFUSED Ollama | `OLLAMA_CONFIGURED=0` · kill switches arriba |
| RAG schema / localhost | Fail-closed ADR-069 — nunca loopback en prod |
| Coste OpenAI | `AUTONOMOUS_ALLOW_OPENAI=0` siempre en steady |

Runbooks: [`CANARY_IA_FLAGS.md`](./CANARY_IA_FLAGS.md) · [`PRIVATE_RAG_RUNBOOK.md`](./PRIVATE_RAG_RUNBOOK.md).

### 4.4 Fallo correo (SES)

| Síntoma | Acción |
|---------|--------|
| UI `ses_configured: false` | Vars `SES_*` en Railway · región `eu-west-1` |
| Bounce/complaint no llegan | SNS → `POST /api/webhooks/ses` · [`../SES_PRODUCTION_SETUP.md`](../SES_PRODUCTION_SETUP.md) |
| Sandbox / denied sending | Acción **CEO/AWS** (apelación) — no resoluble solo en repo |
| Mass-send riesgo | No mass-send sin checklist legal · kill campaña / rate limits |

Detalle: [`../OPS_SES_PROD.md`](../OPS_SES_PROD.md) · [`CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md`](./CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md).

### 4.5 Fallo integraciones (OAuth / Stripe / Twilio / Ads)

| Síntoma | Acción |
|---------|--------|
| BFF `degraded: true` | Esperado si OAuth no configurado — no es outage core |
| Stripe webhook 400 | `STRIPE_WEBHOOK_SECRET` · firma · endpoint prod |
| OAuth token inválido | Reconectar en `/saas/integraciones` · checklist OAuth CEO |
| Twilio/WA down | Módulo opcional — no bloquear CRM core |

Checklists CEO (cuentas externas): `*_CEO_CHECKLIST.md` en esta carpeta · [`../INTEGRATIONS.md`](../INTEGRATIONS.md).

### 4.6 Rotación de secretos

Procedimiento completo: [`SECURITY_OPERATIONS.md`](./SECURITY_OPERATIONS.md) § Rotación.

Resumen:

1. Generar nuevo secreto fuera del repo (`openssl rand -hex 32`).
2. Actualizar **Railway** y **GitHub Secrets** el mismo valor cuando aplique (`CRON_SECRET`).
3. Redeploy / invalidar sesiones si es `JWT_SECRET`.
4. Verificar `/api/health/ready` · un cron smoke · un login.
5. Revocar el secreto antiguo en el proveedor (AWS IAM, Stripe, etc.).

**Nunca** pegar secretos en issues, HANDOVER o commits.

### 4.7 Restauración tras error (orden canónico)

1. Contener (kill switch / rate / freeze sends).
2. Diagnosticar (health + logs + `requestId`).
3. Recuperar servicio (flag o redeploy).
4. Si datos: drill restore → restore controlado.
5. Validar checklist post-deploy.
6. Documentar causa en CHANGELOG + KNOWN_ISSUES.
7. Postmortem breve (P0/P1) — sin tool de pago.

---

## 5. Lo que este runbook no hace

- No migrate/deploy/canary en prod.
- No conecta Datadog/PagerDuty/nuevos SaaS de pago.
- No promete multi-región (bloqueado por coste — ver HA/DR).

