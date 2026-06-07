# OS Production Go-Live Checklist — Lunes

**Fecha objetivo:** lunes 8 de junio de 2026  
**Alcance:** NELVYON OS núcleo (315–322) — clientes, proyectos, tareas, entregables, portal, upload/download, emails  
**Fuera de alcance:** SaaS, CRM SaaS, pipeline SaaS, marketing, web pública  
**Commit de referencia:** `498b6e8` (RLS 322 + auditoría rutas críticas)

---

## Resumen rápido (orden de ejecución)

| # | Paso | Quién | Tiempo est. |
|---|------|-------|-------------|
| 1 | Aplicar migración 322 en producción | Tú (ops) | 5–15 min |
| 2 | `validate:os-core-migrations` | Tú (ops) | 2 min |
| 3 | Bucket privado `os-deliverables` | Tú (Supabase) | 10 min |
| 4 | Variables Railway API | Tú (Railway) | 10 min |
| 5 | Redeploy API | Tú (Railway) | 5–10 min |
| 6 | Smoke test completo E2E | Tú (manual) | 30–45 min |
| 7 | Go/No-Go final | Tú + decisión | 5 min |

**Documentos relacionados:** `OS_RLS_AUDIT.md`, `OS_SMOKE_TEST_FINAL.md`, `OS_PRODUCTION_READINESS.md`

---

## Pre-requisitos (antes del lunes)

Estas variables **no están en la lista del usuario pero son obligatorias** para que OS funcione:

| Variable | Servicio Railway | Notas |
|----------|------------------|-------|
| `DATABASE_URL` | API + Web | Postgres Supabase (service role / pooler) |
| `JWT_SECRET_KEY` | API | Auth plataforma + portal |
| `NEXT_PUBLIC_API_BASE_URL` | Web | URL pública del servicio API |

Confirma que el servicio **Web** tiene `releaseCommand` con migraciones (`apps/web/railway.json`) o aplica migraciones manualmente (paso 1).

---

## 1. Aplicar migración 322 en producción

La migración `322_os_rls.sql` activa RLS defensivo en las 8 tablas `os_*`. Sin ella, `validate:os-core-migrations` falla en la sección RLS.

### Opción A — Manual desde tu PC (recomendado el lunes por control)

PowerShell:

```powershell
cd c:\Users\Asus\Downloads\app_v181\apps\web

$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

pnpm migrate:prod
```

**Log esperado (si 322 no estaba aplicada):**

```
[migrate] run: 322_os_rls.sql
[migrate] done: 322_os_rls.sql
[migrate] all migrations complete
```

**Si ya estaba aplicada:**

```
[migrate] skip: 322_os_rls.sql
```

### Opción B — Release command Railway (servicio Web)

Si despliegas el servicio **Web** con `DATABASE_URL` configurada, el `releaseCommand` ejecuta `migrate.ts` automáticamente. Revisa los logs del paso **Release** (no solo Runtime).

### Verificación SQL rápida (opcional, Supabase SQL Editor)

```sql
SELECT name FROM _migrations WHERE name = '322_os_rls.sql';
SELECT relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'os_clients';
```

- [ ] `322_os_rls.sql` registrada en `_migrations`
- [ ] `relrowsecurity = true` en `os_clients` (y resto tablas `os_*`)

---

## 2. Verificar `validate:os-core-migrations`

PowerShell (misma `DATABASE_URL` de **producción**):

```powershell
cd c:\Users\Asus\Downloads\app_v181\apps\web
$env:DATABASE_URL="postgresql://..."
pnpm validate:os-core-migrations
```

**Salida OK esperada (final):**

```
[validate-os-core] OK _migrations: 322_os_rls.sql
[validate-os-core] OK RLS os_clients
[validate-os-core] OK políticas os_clients (4)
...
[validate-os-core] OK función nelvyon_apply_os_workspace_rls
[validate-os-core] Validación OK (315–322: clients, projects, tasks, deliverables, portal, reviews, versions, RLS).
```

- [ ] Migraciones 315–322 presentes en `_migrations`
- [ ] Columnas, FKs e índices OK
- [ ] RLS + 4 políticas por tabla `os_*`
- [ ] Función `nelvyon_apply_os_workspace_rls` existe

Si falla: no continuar al smoke test. Revisar paso 1 o conectividad `DATABASE_URL`.

---

## 3. Configurar bucket privado `os-deliverables`

En **Supabase Dashboard → Storage**:

1. Crear bucket **`os-deliverables`** (si no existe).
2. Marcar como **privado** (no público).
3. **No** crear políticas de lectura pública (`anon` / `authenticated` sin restricción).
4. El backend sube y firma URLs con **`SUPABASE_SERVICE_ROLE_KEY`** — no requiere políticas RLS de storage para anon.

| Comprobación | Esperado |
|--------------|----------|
| Nombre bucket | `os-deliverables` |
| Público | **No** |
| Upload desde API | OK con service role |
| Download portal | Signed URL 302 (TTL ~600 s) |

Variable opcional en API (default ya correcto):

```env
OS_DELIVERABLES_BUCKET=os-deliverables
```

- [ ] Bucket creado y privado
- [ ] Sin política pública de lectura global
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` listos para paso 4

---

## 4. Configurar variables Railway (servicio API)

En **Railway → servicio API (`backend/`) → Variables**:

| Variable | Valor / origen | Uso OS |
|----------|----------------|--------|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | Storage upload + signed URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (secreto) | Bypass storage; **nunca** en Web |
| `SENDGRID_API_KEY` | SendGrid → API Keys | Emails invite, publicado, revisión |
| `SENDGRID_FROM_EMAIL` | Email verificado en SendGrid (ej. `noreply@tudominio.com`) | Remitente |
| `FRONTEND_APP_URL` | URL pública Web (ej. `https://app.nelvyon.com`) | Enlaces invite y portal en emails |

**Sin `SENDGRID_API_KEY`:** OS sigue funcionando; emails quedan en cola (`no_api_key`).  
**Sin `SUPABASE_*`:** upload guarda `storage_key` en modo mock; download portal puede fallar sin archivo real.

Checklist variables:

- [ ] `SUPABASE_URL` configurada en API
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada en API (secreto)
- [ ] `SENDGRID_API_KEY` configurada en API
- [ ] `SENDGRID_FROM_EMAIL` configurada y verificada en SendGrid
- [ ] `FRONTEND_APP_URL` = dominio real de la app (sin barra final)
- [ ] `DATABASE_URL` y `JWT_SECRET_KEY` ya presentes (pre-requisito)

**No poner** `SUPABASE_SERVICE_ROLE_KEY` en el servicio Web.

---

## 5. Redeploy API

1. Railway → servicio **API** → **Deploy** (o push a `main` si CI conectado).
2. Esperar healthcheck: `GET https://<API_URL>/health` → `200`.
3. Confirmar en logs que no hay errores de importación ni de conexión DB.

Comprobaciones post-deploy:

```text
GET /api/health/live   → 200
GET /api/health/ready  → 200 (si expuesto)
```

- [ ] Deploy API completado sin error
- [ ] Health OK
- [ ] Variables del paso 4 activas en el deployment (no solo guardadas)

Si también redeployas **Web**: confirma `NEXT_PUBLIC_API_BASE_URL` apunta al API redeployado.

---

## 6. Smoke test completo (manual en producción)

Usa un **workspace de prueba** y un email real que puedas abrir. Anota IDs y hora de cada paso.

### Datos de prueba sugeridos

| Campo | Valor ejemplo |
|-------|---------------|
| Cliente | `Smoke Test Cliente Lunes` |
| Email portal | tu email real |
| Archivo upload | PDF pequeño (< 1 MB) |

### Flujo paso a paso

| # | Acción | Dónde | Criterio de éxito | ✓ |
|---|--------|-------|-------------------|---|
| 6.1 | **Crear cliente** | `/os/clientes/nuevo` | Cliente `active`, UUID visible | [ ] |
| 6.2 | **Crear proyecto** | `/os/proyectos/nuevo` | Proyecto `active`, vinculado al cliente | [ ] |
| 6.3 | **Crear tarea** | `/os/tareas/nuevo` | Tarea en lista, vinculada a proyecto | [ ] |
| 6.4 | **Crear entregable** | `/os/entregables/nuevo` | Estado `draft`, visibilidad configurable | [ ] |
| 6.5 | **Subir archivo** | `/os/entregables/{id}` → Subir archivo | Mensaje éxito; en Storage aparece objeto en `os-deliverables` | [ ] |
| 6.6 | **Publicar** | `/os/entregables/{id}` → workflow | Secuencia: **Enviar a revisión** → **Entregar** → **Aprobar (interno)** → **Publicar** → estado `published` + `client_visible` | [ ] |
| 6.7 | **Invitar cliente** | `/os/clientes/{id}` → Portal cliente → Invitar | `201`, enlace copiable `{FRONTEND}/client/accept-invite?token=...` | [ ] |
| 6.8 | **Login portal** | Abrir enlace invite → definir contraseña → `/portal` | Sesión portal activa; `/portal` carga proyectos/entregables | [ ] |
| 6.9 | **Descargar archivo** | `/portal/deliverables` → Download file | Archivo descargado (no 404); contenido correcto | [ ] |
| 6.10 | **Rechazar** (rama A) | Portal → Rechazar con feedback obligatorio | Estado `changes_requested`; email revisión (si SendGrid) | [ ] |
| 6.10b | **Aprobar** (rama B alternativa) | Portal → Aprobar | Estado `approved_by_client` | [ ] |
| 6.11 | **Crear revisión** | OS `/os/entregables/{id}` → **Crear revisión v+1** (solo si `changes_requested`) | Nueva versión `draft`, versión incrementada | [ ] |

**Rama recomendada para probar revisión completa:** ejecutar **6.10 Rechazar**, luego **6.11**, luego repetir upload + publicar y verificar en portal.

### Emails (si SendGrid configurado)

| Evento | Cuándo comprobar |
|--------|------------------|
| Invitación portal | Tras 6.7 |
| Entregable publicado | Tras 6.6 |
| Cambios solicitados | Tras 6.10 rechazar |
| Nueva revisión | Tras 6.11 (si aplica) |

- [ ] Al menos un email recibido (o logs API confirman `status=sent`)

### Errores que bloquean Go

| Síntoma | Causa probable |
|---------|----------------|
| Upload OK pero sin archivo en Storage | `SUPABASE_*` incorrectas o bucket inexistente |
| Download 404 en portal | No `published`/`client_visible`, o sin `storage_key`/archivo |
| Invite sin enlace válido | `FRONTEND_APP_URL` mal configurada |
| Portal login 401 | `JWT_SECRET_KEY` distinta entre deploys |
| validate falla RLS | 322 no aplicada |

---

## 7. Go/No-Go final

### Criterios GO (todos obligatorios)

| # | Criterio | Estado |
|---|----------|--------|
| G1 | `322_os_rls.sql` aplicada en prod | [ ] |
| G2 | `validate:os-core-migrations` → OK 315–322 + RLS | [ ] |
| G3 | Bucket `os-deliverables` privado operativo | [ ] |
| G4 | Variables Railway API (§4) configuradas | [ ] |
| G5 | API redeployada y health OK | [ ] |
| G6 | Smoke 6.1–6.9 completado sin error bloqueante | [ ] |
| G7 | Aprobar **o** rechazar + revisión probados (6.10 + 6.11) | [ ] |

### Criterios NO-GO (cualquiera bloquea)

| # | Condición |
|---|-----------|
| N1 | `validate:os-core-migrations` falla |
| N2 | Upload o download no funciona con archivo real |
| N3 | Portal no aísla cliente (ve datos de otro cliente) |
| N4 | RLS no aplicada (tablas `os_*` sin políticas) |
| N5 | Error 5xx sistemático en rutas `/api/v1/os/*` o `/api/v1/portal/*` |

### Decisión

| Veredicto | Acción |
|-----------|--------|
| **GO** | OS núcleo abierto a clientes reales; monitorizar `security_events` (`source=os`) primeras 48 h |
| **GO condicionado** | Operar sin emails (sin SendGrid) o sin storage real — documentar limitación al equipo |
| **NO-GO** | No onboarding clientes; corregir ítem fallido y repetir checklist desde paso afectado |

**Firma / fecha decisión:**

```
Veredicto: [ ] GO  [ ] GO condicionado  [ ] NO-GO
Responsable: _______________
Fecha/hora: _______________
Notas: _______________
```

---

## Qué hacer tú manualmente (resumen lunes)

1. **Supabase:** ejecutar migración 322 (comando `pnpm migrate:prod` con `DATABASE_URL` prod).
2. **Tu PC:** `pnpm validate:os-core-migrations` contra prod — debe terminar en OK.
3. **Supabase Storage:** crear/verificar bucket privado `os-deliverables`.
4. **Railway API:** pegar las 5 variables (`SUPABASE_*`, `SENDGRID_*`, `FRONTEND_APP_URL`).
5. **Railway API:** redeploy y comprobar `/health`.
6. **Navegador:** recorrer smoke test §6 (30–45 min) con email real.
7. **Decisión:** marcar Go/No-Go §7 y guardar este documento cumplimentado.

**No necesitas tocar código** el lunes — solo ops, variables, migración y prueba manual.

---

## Referencia rápida de comandos

```powershell
# Migrar prod
cd c:\Users\Asus\Downloads\app_v181\apps\web
$env:DATABASE_URL="<PROD_URL>"
pnpm migrate:prod

# Validar
pnpm validate:os-core-migrations

# Tests locales (opcional, antes del lunes)
cd ..\..\backend
python -m pytest tests/test_os_deliverable_upload.py tests/test_portal_deliverable_download.py tests/test_os_notifications.py -q
```

---

*Checklist generado para go-live OS — commit `498b6e8`. Actualizar casillas el lunes tras ejecución.*
