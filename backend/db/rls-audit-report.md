# Auditoría RLS Supabase — NELVYON

**Fecha:** 15 mayo 2026  
**Proyecto Supabase:** `lezzkqpkxcoxqqcgohof`  
**Migraciones:** `279_rls_audit.sql`, `280_rls_service_role.sql`

## Resumen ejecutivo

Row Level Security (RLS) está habilitado y forzado (`FORCE ROW LEVEL SECURITY`) en todas las tablas con datos de clientes accesibles vía rol `authenticated` / `anon`. El backend Next.js usa `DbClient` con `DATABASE_URL` (conexión Postgres con privilegios de servicio que omiten RLS). No existe cliente Supabase JS en el frontend en v1; si se añade, debe usar únicamente la anon key.

## Roles y acceso

| Rol | Uso | RLS |
|-----|-----|-----|
| `service_role` / `DATABASE_URL` (backend) | API routes, webhooks, workers, migraciones | Bypass |
| `authenticated` | Supabase JS SDK con sesión de usuario | Aplicado |
| `anon` | Lecturas públicas limitadas por policy | Aplicado |

## Tablas con RLS (datos de tenant)

| Tabla | Política | Columna de aislamiento |
|-------|----------|------------------------|
| `nelvyon_users` | `*_own` (select/insert/update/delete) | `user_id = nelvyon_jwt_user_id()` |
| `subscriptions` | `*_own` | `user_id` |
| `usage_events` | `*_own` | `user_id` |
| `api_keys` | `*_own` | `user_id` |
| `onboarding` | `*_own` | `user_id` |
| `dunning_log` | `*_own` | `tenant_id = nelvyon_current_tenant_id()` |
| `os_jobs` | `*_own` | `client_id = nelvyon_current_tenant_id()` |
| `os_job_results` | `*_own` | `tenant_id` |
| `os_upsell_suggestions` | `*_own` | `client_id` |
| `*_results` (~120+ tablas OS) | `*_own` | `user_id` (dinámico en migración) |

Funciones helper:

- `nelvyon_jwt_user_id()` — `auth.uid()` o claim JWT `sub`
- `nelvyon_current_tenant_id()` — `tenant_id` del usuario autenticado

## Tablas sin RLS (justificación)

| Tabla | Motivo |
|-------|--------|
| `usage_limits` | Catálogo de planes, sin datos por tenant |
| `status_checks`, `incidents` | Monitorización de plataforma |
| `waitlist` | Solo backend / marketing; sin SDK cliente en v1 |
| `_migrations` | Control interno de migraciones |

## Verificación de código

### `backend/db/DbClient.ts`

- Usa `DATABASE_URL` (pool `pg`), no Supabase anon key.
- Documentado: conexión debe ser service role / rol con bypass RLS.
- No importa `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Frontend

- No hay `apps/web/src/lib/supabase.ts` con SDK activo en v1.
- Añadido `supabaseClient.ts` con validación: solo anon key en cliente, prohibido service role.

## Cancelación / dunning (mig 276–278)

Columnas de cancelación en `nelvyon_users` quedan protegidas por las mismas políticas RLS de `nelvyon_users`.

## Recomendaciones post-lanzamiento

1. Alinear `auth.uid()` de Supabase Auth con `nelvyon_users.user_id` al migrar auth a Supabase.
2. Añadir RLS a `waitlist` si se expone insert vía cliente.
3. Ejecutar prueba manual en Supabase SQL Editor con JWT de dos tenants distintos.

## Checklist

- [x] RLS ENABLE + FORCE en tablas de cliente
- [x] Políticas SELECT/INSERT/UPDATE/DELETE por tenant
- [x] Backend documentado como service_role
- [x] Sin service_role en variables `NEXT_PUBLIC_*`
- [x] Migraciones y reporte versionados
