# Runbook — Gate migraciones productivas (ADR-064)

> **Estado:** IMPLEMENTED_VERIFIED (código) · tip post-deploy staging  
> **Hecho histórico:** ERP 519/520 ya aplicadas en prod (auto-deploy previo) — **no revertir**.  
> Fecha: 2026-07-25

## Problema

`preDeployCommand` = `pnpm -C apps/web migrate:prod` aplicaba **todas** las SQL pendientes en **producción** en cada push a `main`, sin aprobación CEO.

## Solución

`migrate-prod.ts` + `prodMigrateGate.ts`:

| Entorno | Comportamiento |
|---------|----------------|
| Staging / non-prod | Aplica migraciones (como antes) |
| Production + **sin** aprobación + **0** pending | Exit **0** (no-op; gate activo) |
| Production + **sin** aprobación + pending **>0** | Exit **1** (bloquea deploy) |
| Production + aprobación CEO | Aplica migraciones |

### Variables de aprobación (ventana única)

```
NELVYON_PROD_MIGRATE_APPROVED=1
NELVYON_PROD_MIGRATE_APPROVED_BY=Daniel
NELVYON_PROD_MIGRATE_COMMIT_SHA=<tip12>   # opcional pero recomendado
```

Tras el deploy exitoso: **quitar** las tres variables (reversible).

Opcional: `NELVYON_DEPLOY_ENV=staging|production` para forzar etiqueta.

## Procedimiento CEO — aplicar migración futura en prod

1. Tip revisado en staging (migrate auto OK).
2. Setear las 3 vars en Railway **production** `@nelvyon/web`.
3. Deploy tip (manual o push).
4. Verificar logs: `gate: production: migrate apply allowed` + `done: NNN_*.sql`.
5. **Unset** vars de aprobación.
6. Health live/ready OK.

## Incidente / rollback

| Caso | Acción |
|------|--------|
| Deploy bloqueado por pending sin approval | Esperado — no forzar; o aprobar ventana CEO |
| Migrate aplicada por error con approval | Restore Postgres PITR / backup pre-deploy; no DROP improvisado |
| Gate bypass sospechoso | Comprobar que no existan vars `NELVYON_PROD_MIGRATE_*` en prod; rotar secrets si hace falta |
| 519/520 ya en prod | **No revertir**; app sana; documentado ADR-063/064 |

## Verificación lectura prod

```
curl -sS https://nelvyon.com/api/health/live
curl -sS https://nelvyon.com/api/health/ready
# logs deploy: pending_count=0 + skip apply (gate active)
```

## Regresión

`backend/db/__tests__/prodMigrateGate.test.ts`
