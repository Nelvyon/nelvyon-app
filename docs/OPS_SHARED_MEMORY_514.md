# OPS — Shared Memory migration 514 (+ RLS 515)

> Verificación **read-only** en DB. No aplica migraciones ni toca producción sin aprobación.

## Qué hace 514

- Tablas `saas_shared_memory_entries` + `saas_shared_memory_audit`
- Índices + unique upsert key
- Flag runtime: `NELVYON_SHARED_MEMORY_ENABLED=1`

## Qué hace 515

- RLS + FORCE RLS en ambas tablas (usa `nelvyon_current_saas_tenant_uuid()` de 311)
- Índice parcial `entry_id` en audit

## Aplicar (staging/local con DATABASE_URL)

```powershell
pnpm -C apps/web migrate
node scripts/verify-shared-memory-schema.mjs
```

Railway: `releaseCommand` ya ejecuta `migrate:prod` — 514/515 se aplican en próximo deploy **solo si** el servicio apunta a este commit.

## Verificar (sin afirmar remoto)

```powershell
$env:DATABASE_URL="<staging-or-local-url>"
node scripts/verify-shared-memory-schema.mjs
# Evidencia: backend/local-ai/benchmarks/shared_memory_schema_evidence.json
```

| Campo evidencia | Significado |
|-----------------|-------------|
| `ok` | Tablas + `_migrations` 514 presentes |
| `verified` | Además RLS + `_migrations` 515 |
| exit 2 | Sin DATABASE_URL |
| exit 1 | Gaps de schema |

## Rollback (solo con aprobación humana)

1. `ALTER TABLE … DISABLE ROW LEVEL SECURITY` + `DROP POLICY …` (515)
2. **No** dropear tablas 514 si hay datos — backup primero
3. Flag off: `NELVYON_SHARED_MEMORY_ENABLED=0`

## Riesgos

- 514 sin 515: aislamiento solo app-layer (mitigado por 515)
- Service role / `DATABASE_URL` bypassa RLS (diseño actual DbClient) — RLS protege roles JWT Supabase
