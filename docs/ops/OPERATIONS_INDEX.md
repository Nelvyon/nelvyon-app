# OPERATIONS INDEX — NELVYON (SSOT operativo)

> **Actualizado:** 2026-07-29 · **claimReady: false** · canary IA **KILL ON** · sin secretos  
> Punto de entrada único para operación de nivel mundial. No sustituye `docs/HANDOVER.md` (estado vivo).

## Arranque (orden obligatorio)

| # | Documento | Uso |
|---|-----------|-----|
| 0 | [`../HANDOVER.md`](../HANDOVER.md) | Estado actual + próximo paso EXACTO |
| 1 | [`WORLD_CLASS_OPS_RUNBOOK.md`](./WORLD_CLASS_OPS_RUNBOOK.md) | Deploy · rollback · incidencias por fallo |
| 2 | [`../LAUNCH_CHECKLIST_DEFINITIVE.md`](../LAUNCH_CHECKLIST_DEFINITIVE.md) | Checklist staging / prod / post-deploy |
| 3 | [`SECURITY_OPERATIONS.md`](./SECURITY_OPERATIONS.md) | Secretos · RBAC · RLS · fail-closed · rate limits |
| 4 | [`../OPS.md`](../OPS.md) | Health · logs · crons · backups · observabilidad |
| 5 | [`../DEVELOPER_ONBOARDING.md`](../DEVELOPER_ONBOARDING.md) | Incorporación de un desarrollador |

## Runbooks por escenario

| Escenario | Documento |
|-----------|-----------|
| Deploy Railway | [`../RAILWAY_DEPLOY_CHECKLIST.md`](../RAILWAY_DEPLOY_CHECKLIST.md) · [`../DEPLOYMENTS.md`](../DEPLOYMENTS.md) |
| Rollback deploy / flags | [`WORLD_CLASS_OPS_RUNBOOK.md`](./WORLD_CLASS_OPS_RUNBOOK.md) § Rollback · [`HA_DR_SCALE_RUNBOOK.md`](./HA_DR_SCALE_RUNBOOK.md) |
| Incidencia genérica | [`INCIDENT_RUNBOOK.md`](./INCIDENT_RUNBOOK.md) |
| HA / DR / RPO-RTO | [`HA_DR_SCALE_RUNBOOK.md`](./HA_DR_SCALE_RUNBOOK.md) |
| Restore Postgres | [`POSTGRES_RESTORE_DRILL.md`](./POSTGRES_RESTORE_DRILL.md) |
| Migrate prod (gated) | [`PROD_MIGRATE_521_522_RUNBOOK.md`](./PROD_MIGRATE_521_522_RUNBOOK.md) · [`PROD_MIGRATE_GATE_RUNBOOK.md`](./PROD_MIGRATE_GATE_RUNBOOK.md) |
| Fallo IA / canary | [`CANARY_IA_FLAGS.md`](./CANARY_IA_FLAGS.md) · [`PRIVATE_RAG_RUNBOOK.md`](./PRIVATE_RAG_RUNBOOK.md) |
| Correo SES | [`../SES_PRODUCTION_SETUP.md`](../SES_PRODUCTION_SETUP.md) · [`../OPS_SES_PROD.md`](../OPS_SES_PROD.md) |
| Integraciones OAuth | [`INTEGRATIONS_OAUTH_HEALTH_CHECKLIST.md`](./INTEGRATIONS_OAUTH_HEALTH_CHECKLIST.md) · [`../INTEGRATIONS.md`](../INTEGRATIONS.md) |
| Mesh staging | [`MESH_OPTION_A_STAGING.md`](./MESH_OPTION_A_STAGING.md) |
| DNS | [`DNS_APP_NELVYON.md`](./DNS_APP_NELVYON.md) |

## Inventarios

| Tema | Documento |
|------|-----------|
| Secretos / env | [`../PRODUCTION_SECRETS.md`](../PRODUCTION_SECRETS.md) |
| Entornos / URLs | [`../ENVIRONMENTS.md`](../ENVIRONMENTS.md) |
| Infra | [`../INFRASTRUCTURE.md`](../INFRASTRUCTURE.md) |
| DB / migraciones / RLS | [`../DATABASE.md`](../DATABASE.md) |
| Observabilidad (realidad) | [`../NELVYON_OBSERVABILITY_REALITY.md`](../NELVYON_OBSERVABILITY_REALITY.md) + [`../OPS.md`](../OPS.md) |
| Issues activos | [`../KNOWN_ISSUES.md`](../KNOWN_ISSUES.md) |

## Reglas no negociables

- **No** migrate/deploy prod sin SÍ CEO + runbook ADR-064.
- **No** abrir canary IA mientras `claimReady: false` y KILL ON.
- **No** restore destructivo contra prod sin drill previo en no-prod.
- **No** inventar estado: si no está verificado en Railway/AWS/GitHub, marcar **REQUIERE OPS**.
