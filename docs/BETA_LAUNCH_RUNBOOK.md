# Runbook operativo — Beta NELVYON SaaS (P0)

**Objetivo:** validar producción (o staging equivalente) **antes de captar clientes beta**.  
**Alcance:** solo operaciones de verificación; no sustituye desarrollo ni ventas.  
**Prerrequisito:** acceso a Railway, Supabase/Postgres y `DATABASE_URL` con rol **service_role** (pooler Postgres).

> **Importante:** este runbook describe qué ejecutar y cómo interpretar resultados. **No ejecutar en producción sin backup** si se planea `--execute` en Block B (ETL apply). Para pre-beta, usar **`--dry-run` únicamente**.

---

## Resumen del flujo P0

```
1. DATABASE_URL + Railway releaseCommand
2. Migraciones 310–314 (_migrations + validadores)
3. pnpm validate:saas-deals-migrations + saas:validate-bridge
4. pnpm saas:block-b -- --dry-run
5. Revisar contactos / deals / huérfanos (SQL + audit JSON)
6. Smoke test manual en UI
7. Go / No-Go
```

**Tiempo total estimado:** 3–5 horas (primera vez).

---

## 0. Preparación del entorno local

Desde la raíz del repo, con Node/pnpm instalados:

```powershell
cd c:\Users\Asus\Downloads\app_v181\apps\web
```

Configurar credenciales **sin commitear**:

```powershell
# Opción A: variable de entorno en la sesión
$env:DATABASE_URL = "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Opción B: archivo local (gitignored)
# apps/web/.env.production.local  →  DATABASE_URL=...
```

### DATABASE_URL — qué es OK vs error

| Señal | OK | Error |
|-------|-----|-------|
| Host | Supabase pooler (`*.pooler.supabase.com`) o Postgres directo controlado | URL vacía, localhost accidental en prod |
| Rol | Usuario **service_role** / postgres con bypass RLS para scripts | Anon key, JWT en URL, rol de solo lectura sin permisos |
| `DbClient` arranca | Scripts conectan y ejecutan `SELECT 1` | `DATABASE_URL is not defined or empty` |
| Seguridad | Solo en máquina ops / CI secreto; nunca en repo | `.env` commiteado con password |

**Si falla:** corregir variable en Railway (servicio Next/web) y en local; redeploy si la app en prod no arranca. Verificar que no se usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` como connection string.

---

## 1. Validar Railway y releaseCommand

### 1.1 Config esperada

Archivo de referencia en repo: `railway.json` (raíz):

```json
"releaseCommand": "cd apps/web && pnpm exec tsx ../../backend/db/migrate.ts",
"healthcheckPath": "/api/health/live"
```

### 1.2 Pasos en Railway UI

1. Abrir el servicio **web/Next** desplegado.
2. **Settings → Config file path:** confirmar si usa `railway.json` raíz o `apps/web/railway.json` (deben ser coherentes).
3. Abrir el **último deploy → Release** (fase pre-start).
4. Buscar líneas del migrador:
   - `[migrate] skip: …` → migración ya aplicada
   - `[migrate] run: …` → migración aplicada en ese release
   - Errores SQL / exit code ≠ 0 → **STOP**

### 1.3 Healthcheck

| Endpoint | Uso | OK | Error |
|----------|-----|-----|-------|
| `GET /api/health/live` | Liveness Railway | `{ "ok": true }` | 5xx, timeout |
| `GET /api/health/ready` | Readiness (manual) | 200 + DB ok | 503 si DB caída |

```powershell
curl -s https://[TU-DOMINIO]/api/health/live
curl -s https://[TU-DOMINIO]/api/health/ready
```

**Si falla release migrate:** no captar clientes; aplicar migraciones manualmente (sección 2) o corregir `DATABASE_URL` en Railway y redeploy.

---

## 2. Validar migraciones 310–314

### 2.1 Lista requerida

| Migración | Contenido |
|-----------|-----------|
| `310_saas_tenant_workspace_bridge.sql` | `saas_tenants.workspace_id` + backfill |
| `311_saas_tenant_rls.sql` | RLS core SaaS (contacts, workflows, campañas…) |
| `312_saas_deals.sql` | Tabla `saas_deals` |
| `313_saas_deals_rls.sql` | RLS en `saas_deals` |
| `314_saas_workflows_deal_trigger.sql` | CHECK `deal_stage_changed` en workflows |

### 2.2 SQL directo (psql o Supabase SQL Editor)

```sql
SELECT name, executed_at
FROM _migrations
WHERE name IN (
  '310_saas_tenant_workspace_bridge.sql',
  '311_saas_tenant_rls.sql',
  '312_saas_deals.sql',
  '313_saas_deals_rls.sql',
  '314_saas_workflows_deal_trigger.sql'
)
ORDER BY name;
```

| Resultado | Interpretación |
|-----------|----------------|
| **5 filas** | OK migraciones registradas |
| **< 5 filas** | **ERROR P0** — aplicar pendientes antes de beta |

### 2.3 Validar migración 314 (sin script npm dedicado)

```sql
SELECT pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conname = 'saas_workflows_trigger_type_check';
```

| Resultado | OK | Error |
|-----------|-----|-------|
| Definición CHECK | Contiene `'deal_stage_changed'` | Solo triggers antiguos o constraint ausente |

**Si falla 314:** desde `apps/web` con `DATABASE_URL` prod (con backup):

```powershell
pnpm exec tsx ../../backend/db/migrate.ts
```

Solo aplica migraciones no registradas en `_migrations`.

---

## 3. Validadores automatizados

Ejecutar desde `apps/web` con `DATABASE_URL` apuntando al entorno a validar.

### 3.1 Bridge tenant (310)

```powershell
pnpm saas:validate-bridge
```

| Salida | OK | Error |
|--------|-----|-------|
| Final | `[validate-bridge] OK` | `[validate-bridge] FAILED` o exit code 1 |
| JSON `ok` | `true` | `false` |
| `summary.withoutWorkspace` | `0` | `> 0` tenants sin workspace |
| `_migrations` 310 | presente en reporte | ausente |

**Si falla:** completar migración 310; backfill `workspace_id` para tenants huérfanos; ver `backend/saas/scripts/validateTenantBridge.ts` y `docs/PHASE_1A_TENANT_BRIDGE.md`.

### 3.2 Deals migrations (312 + 313)

```powershell
pnpm validate:saas-deals-migrations
```

| Salida | OK | Error |
|--------|-----|-------|
| Final | `[validate-saas-deals] Validación OK.` | `Validación fallida.` |
| `_migrations` | OK 312 y 313 | `FALTA migración` |
| Tabla | `OK tabla saas_deals` | `FALTA tabla` |
| RLS | `OK RLS habilitado` | `RLS no habilitado` |

**Si falla:** ejecutar `migrate.ts`; verificar permisos DB; no habilitar beta hasta OK.

---

## 4. Block B — auditoría de datos (dry-run)

```powershell
pnpm saas:block-b -- --dry-run
```

**Qué hace (9 pasos, sin apply):**

1. Valida bridge  
2–3. ETL contactos dry-run  
6. ETL deals dry-run  
9. Auditoría final → escribe `docs/BLOCK_B_ETL_REPORT.json`

### 4.1 Salida OK

| Señal | Significado |
|-------|-------------|
| `[block-b] OK` al final | Dry-run completado |
| Bridge `ok: true` | Bridge válido |
| Sin exit 1 por conflictos | Sin conflictos dedupe irresolubles |
| Reporte JSON generado | Traza guardada en repo local (no commitear secrets) |

### 4.2 Salida error / warning

| Señal | Severidad | Acción |
|-------|-----------|--------|
| `Bridge inválido` | **ERROR** | Corregir 310/bridge antes de continuar |
| `Conflictos contactos/deals sin resolver` | **ERROR** | Revisar JSON; resolver dedupe manual o con `--execute` (solo tras aprobación) |
| `AVISO: N deals legacy sin contacto ETL` | **WARNING** | Revisar huérfanos; CRM ETL antes de deals ETL |
| `[block-b] FATAL` | **ERROR** | Revisar stack trace, `DATABASE_URL`, conectividad |

> **No usar `--execute` en pre-beta** salvo ventana de mantenimiento acordada. Apply modifica datos legacy → SaaS.

---

## 5. Revisar contactos

### 5.1 Conteos básicos

```sql
SELECT COUNT(*) AS total FROM saas_contacts;

SELECT status, COUNT(*)
FROM saas_contacts
GROUP BY status
ORDER BY COUNT(*) DESC;
```

### 5.2 Duplicados por email (mismo tenant)

```sql
SELECT tenant_id, lower(trim(email)) AS email, COUNT(*) AS n
FROM saas_contacts
WHERE email IS NOT NULL AND trim(email) <> ''
GROUP BY tenant_id, lower(trim(email))
HAVING COUNT(*) > 1
ORDER BY n DESC
LIMIT 20;
```

| Resultado | OK para beta cerrada | Acción si no OK |
|-----------|----------------------|-----------------|
| 0 grupos duplicados | Ideal | Plan de merge manual post-beta |
| Pocos duplicados conocidos (ETL) | Aceptable con nota | Documentar; no bloqueante si acotado |
| Muchos duplicados activos | **Riesgo** | Ejecutar ETL/dedupe antes de clientes nuevos |

### 5.3 Campos del audit Block B

En `finalAudit` del JSON:

| Campo | OK orientativo | Revisar si |
|-------|----------------|------------|
| `saasContactsTotal` | Coherente con expectativa | 0 inesperado con legacy poblado |
| `contactDuplicateGroups` | 0 o bajo conocido | Alto sin explicación |
| `contactDuplicateRows` | 0 o bajo | > 0 filas extra por grupo |
| `contactsWithEtlTag` | Coherente si hubo ETL | — |

---

## 6. Revisar deals

```sql
SELECT COUNT(*) AS total FROM saas_deals;

SELECT stage, COUNT(*)
FROM saas_deals
GROUP BY stage
ORDER BY COUNT(*) DESC;

SELECT COUNT(*) AS open_deals
FROM saas_deals
WHERE stage NOT IN ('won', 'lost');
```

| Métrica | OK | Error / revisar |
|---------|-----|-----------------|
| Tabla existe | Sí | Error 42P01 → migración 312 |
| Deals por tenant | Aislados por `tenant_id` | Mezcla cross-tenant (investigar urgente) |
| `open_deals` | Coherente con negocio | — |

---

## 7. Revisar huérfanos

### 7.1 Deals sin contacto

```sql
SELECT COUNT(*) AS deals_without_contact
FROM saas_deals
WHERE contact_id IS NULL;

SELECT id, tenant_id, title, stage, source
FROM saas_deals
WHERE contact_id IS NULL
LIMIT 20;
```

### 7.2 Huérfanos ETL (contacto legacy no migrado)

```sql
SELECT COUNT(*) AS deal_orphans
FROM saas_deals
WHERE contact_id IS NULL
  AND source IS NOT NULL
  AND source NOT LIKE 'etl:legacy_id:pipeline_deals:%';
```

| Resultado | OK para beta | Acción |
|-----------|--------------|--------|
| Solo `pipeline_deals` sin contacto | Esperado por diseño | Documentar |
| `deal_orphans` = 0 | Ideal | — |
| `deal_orphans` > 0 | Aceptable en piloto **si** se conoce causa | CRM ETL → re-auditar; no vender “datos 100% limpios” |
| Deals activos sin contacto en tenants nuevos | **Revisar** | Bug o import manual incorrecto |

Campos en audit: `dealsWithoutContact`, `dealOrphans`, `legacy*Remaining`.

---

## 8. Smoke test manual (UI)

**Entorno:** staging o prod con usuario de prueba (owner).  
**Rutas permitidas en demo:** solo nav core `/saas/*`.

### 8.1 Secuencia

| Paso | Acción | OK | Error |
|------|--------|-----|-------|
| 1 | `/saas/onboarding` o login → tenant existente | Llega a dashboard | 401/403 loop |
| 2 | **CRM** → crear contacto | Contacto en lista | 403 viewer; 400 quota |
| 3 | **Pipeline** tab → crear deal vinculado | Deal en kanban | 500; tabla missing |
| 4 | **Mover deal** (drag o botones) a `proposal` | Stage persiste tras refresh | Revert; 404 |
| 5 | **Workflows** → activo con trigger `deal_stage_changed` + `stage_to: proposal` | Run en historial tras paso 4 | Sin runs |
| 6 | **Dashboard** → pipeline comercial / actividad | KPIs o empty state coherente | Error rojo permanente |
| 7 | **Campañas (opcional preview)** → audiencia `deal_stage: proposal` → launch | Completa con N destinatarios | 500 SQL join |
| 8 | Rol **viewer** (otro usuario) | Sin botones write; kanban read-only | Puede editar → **ERROR P0** |

### 8.2 Workflow de prueba mínimo

Crear workflow:

- Trigger: `deal_stage_changed`
- `trigger_config`: `{ "stage_to": "proposal" }`
- Acción: `notify` con mensaje de prueba

Mover un deal a `proposal` → verificar **Runs** con status `completed`.

### 8.3 Si falla el smoke test

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| 500 en deals | 312–314 no aplicadas | Sección 2 |
| Workflow no dispara | 314 missing o stage no vía `/stage` | Usar kanban/stage route; verificar 314 |
| 403 inesperado | RBAC rol incorrecto | Verificar membership / owner |
| Campaña 0 destinatarios | Sin deals en stage filtrado | Crear deal en stage correcto |

---

## 9. Go / No-Go beta

### Go (puede captar design partners)

- [ ] 5/5 migraciones 310–314 en `_migrations`
- [ ] `pnpm saas:validate-bridge` OK
- [ ] `pnpm validate:saas-deals-migrations` OK
- [ ] 314 CHECK incluye `deal_stage_changed`
- [ ] `pnpm saas:block-b -- --dry-run` termina OK (warnings documentados)
- [ ] Railway release migrate sin error en último deploy
- [ ] `DATABASE_URL` service_role confirmado
- [ ] Smoke test 1–8 OK
- [ ] Beta Terms firmados / enviados
- [ ] Script demo acotado (sin URLs F62 / legacy)

### No-Go (detener captación)

- Cualquier migración P0 faltante
- Bridge inválido
- Tabla `saas_deals` ausente
- Cross-tenant data visible en pruebas
- Smoke test CRM/deals roto en prod

---

## Qué NO vender todavía (recordatorio ops → ventas)

Compartir con comercial antes del primer cliente:

1. **Campañas** — envío simulado; no email/SMS real.  
2. **Workflows** — solo `deal_stage_changed` + manual automáticos.  
3. **Billing** — cuotas sí; cobro integrado no.  
4. **Módulos fuera del nav** — no demo, no promesa.  
5. **Legacy APIs** `/pages/api/saas/*` — fuera del producto beta.  
6. **Datos** — huérfanos/duplicados legacy deben estar documentados si existen.

Ver detalle: [`BETA_LAUNCH_AUDIT.md`](./BETA_LAUNCH_AUDIT.md).

---

## Comandos rápidos (copiar)

```powershell
cd c:\Users\Asus\Downloads\app_v181\apps\web

# Validadores
pnpm saas:validate-bridge
pnpm validate:saas-deals-migrations

# Auditoría datos (solo dry-run pre-beta)
pnpm saas:block-b -- --dry-run

# Migración manual si release falló
pnpm exec tsx ../../backend/db/migrate.ts
```

---

## Siguiente paso después de este runbook

1. Ejecutar checklist en **staging** primero; repetir en **prod** con ventana acordada.  
2. Archivar salida (logs Railway, JSON Block B, capturas smoke test) — sin secrets.  
3. Reunión Go/No-Go con ops + comercial.  
4. Si **Go:** abrir lista de design partners con positioning de `BETA_LAUNCH_AUDIT.md`.  
5. Si **No-Go:** abrir ticket P0 por ítem fallido; no captar clientes hasta re-run OK.

---

## Referencias

| Recurso | Ubicación |
|---------|-----------|
| Auditoría beta | `docs/BETA_LAUNCH_AUDIT.md` |
| Migraciones | `backend/db/migrations/310_*.sql` … `314_*.sql` |
| Migrate runner | `backend/db/migrate.ts` |
| Block B script | `backend/saas/scripts/runBlockB.ts` |
| Railway config | `railway.json` (raíz) |
| Health | `apps/web/src/app/api/health/live/route.ts` |
