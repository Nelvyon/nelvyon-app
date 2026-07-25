# Runbook — Producción ERP migraciones 519 / 520 (NO EJECUTAR sin CEO)

> **Estado:** PREPARED · **BLOCKED_CEO** hasta autorización explícita posterior.  
> **Staging:** tip `9e931f08` · `_migrations` incluye **519+520** · restart **ALL_PASS**.  
> **Prod:** **NO** aplicar 519/520 en este documento · **NO** redeploy · **NO** flags productivos.  
> Fecha: 2026-07-25 · ADR-061 / ADR-062

## 1. Alcance

| Mig | Contenido | Riesgo |
|-----|-----------|--------|
| `519_erp_non_financial_cores.sql` | Tablas companion ERP (suppliers, PO, products, warehouses, stock_moves, MO, projects) · `CREATE IF NOT EXISTS` · índices | Bajo — aditivo |
| `520_erp_postgres_persistence.sql` | `erp_domain_snapshots` + expansiones + audit/idempotency + RLS helpers · `IF NOT EXISTS` | Medio — RLS + GUC `app.tenant_id` |

**Fuera de alcance:** pagos, bancos, GL, fiscal, nóminas, Odoo, OpenAI, MCP/SM productivo, Pepito.

## 2. Orden e idempotencia

1. Confirmar tip prod contiene ambos archivos (nunca editar migraciones históricas).
2. Runner: `pnpm -C apps/web migrate:prod` (Railway `releaseCommand` / `preDeployCommand`).
3. Tracking: `_migrations(name)` — re-run skips applied names.
4. SQL usa `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`.

## 3. Tiempo / locks (estimado)

| Fase | Estimación staging observada | Nota prod |
|------|------------------------------|-----------|
| 519 | segundos (DDL vacío) | ACCESS EXCLUSIVE breve por CREATE |
| 520 | segundos–1 min (DDL + RLS) | Evitar ventana de pico; no backfill masivo |
| App boot | health `/api/health/live` | Rollback = redeploy tip previo **sin** re-run destructive |

No hay `UPDATE` masivo ni `LOCK TABLE` explícito de larga duración en 519/520.

## 4. Preflight obligatorio (solo lectura en prod)

Ejecutar **antes** de cualquier migrate (si hay acceso autorizado de lectura):

```sql
-- ¿Ya aplicadas?
SELECT name, executed_at FROM _migrations
 WHERE name IN (
   '519_erp_non_financial_cores.sql',
   '520_erp_postgres_persistence.sql'
 ) ORDER BY name;

-- ¿Conflicto de objetos?
SELECT to_regclass('public.erp_domain_snapshots') AS snap,
       to_regclass('public.erp_suppliers') AS suppliers;

-- Backup reciente
-- (usar procedimiento Railway/Postgres backup existente — no inventar proveedor)
```

Checklist:

- [ ] Backup Postgres prod verificado (RPO documentado en `HA_DR_SCALE_RUNBOOK.md`)
- [ ] Tip git prod = tip con 519/520 revisado
- [ ] Staging smoke A/B + concurrency + restart **ALL_PASS** en mismo tip (o tip ancestro)
- [ ] Autorización **CEO escrita** adjunta (fecha + nombre)
- [ ] Ventana de mantenimiento comunicada
- [ ] Observabilidad: health live/ready OK baseline

## 5. Procedimiento de apply (FUTURO — no ejecutar ahora)

1. CEO firma SÍ en este runbook / ticket.
2. Snapshot backup prod.
3. Deploy tip autorizado (Railway prod) → `migrate:prod` aplica 519 luego 520.
4. Verificar `_migrations` + `to_regclass('erp_domain_snapshots')`.
5. Smoke **no destructivo**: login SaaS QA prod (si existe) GET `/api/saas/erp/purchases` → 200 vacío o datos; crear supplier smoke tag + DELETE/leave tagged.
6. Health live git_sha = tip.
7. Si falla: ver §6.

## 6. Rollback

| Situación | Acción |
|-----------|--------|
| Mig falla a mitad | Runner no marca `_migrations` incompleta; fix tip; **no** hand-edit `_migrations` |
| App unhealthy post-mig | Redeploy tip **anterior** (código sin depender de 520). Tablas 519/520 **pueden quedar** (aditivas, inocuas si código viejo no las usa) |
| Datos corruptos en snapshots | Restore backup Postgres al PITR pre-deploy (último recurso) |
| Dual-write futuro (ADR-062) | Apagar flags → snapshot-only |

**No** DROP tables en pánico sin backup restore plan.

## 7. Compatibilidad

- Código pre-`9e931f08` sin `with*Persistence`: ignora snapshots (in-memory) — **incompatible** con multi-replica; no recomendar tip viejo tras migrate.
- Código con ADR-061: requiere `DATABASE_URL` + 520 para durabilidad.
- Service role bypass RLS; app **siempre** filtra `tenant_id` (ADR-004).

## 8. Multirréplica (post-prod)

- SSOT en Postgres + `FOR UPDATE` por (tenant, domain) → seguro con N réplicas app.
- Demostración con 2 réplicas: **PREPARED_OFF / 0€** — ver HANDOVER; prueba = escalar staging réplicas temporalmente **solo con CEO** (puede implicar coste Railway → no hacer sin aprobación).

## Estado (RUNBOOK UPDATE 2026-07-25)

> **Schema 519/520 en producción: YA APLICADO** (evidencia: deploy `05abdfa7` → `migrate` **skip** ambos ficheros).  
> Esta sección deja de ser “no ejecutar migrate” y pasa a **reconocimiento CEO / gobernanza auto-deploy**.

| Campo | Valor |
|-------|-------|
| Autorizo **narrativa** “ERP prod schema approved” | ☐ SÍ / ☐ NO |
| Política auto-deploy+migrate en prod | ☐ mantener / ☐ desactivar / ☐ manual promote only |
| Nombre | |
| Fecha | |

### Hallazgo

Pushes a `main` disparan Railway production `@nelvyon/web` + `preDeployCommand` `migrate:prod`. Eso aplicó 519/520 sin firma CEO en el runbook. Staging evidencia de calidad permanece válida; el gap es **proceso**, no “schema ausente”.

