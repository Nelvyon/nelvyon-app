# Fase 2D — Documentos, biblioteca y entregas OS

## TAREA 0 — Migración `281_os_deals_tasks.sql`

### ¿Está en el flujo normal de migraciones?

**Sí.** El runner `backend/db/migrate.ts` recorre **todos** los `.sql` en `backend/db/migrations/` en orden alfabético y registra cada uno en `_migrations`. El archivo `281_os_deals_tasks.sql` se ejecuta automáticamente **la próxima vez** que corras migrate y aún no conste en `_migrations`.

### ¿Railway la ejecuta sola?

**No.** El `Dockerfile` de `apps/web` arranca con `CMD ["node", "server.js"]` y **no** invoca `pnpm migrate` ni `migrate:prod`. `railway.json` no define release command de migraciones.

Por tanto, en producción **hay que ejecutar migraciones manualmente** (o añadir un paso de release en Railway) antes de usar pipeline/tareas.

### Riesgo si no se aplica 281

| Ruta | Sin tablas `os_deals` / `os_tasks` |
|------|-------------------------------------|
| `/os/pipeline` | API 500 / error al listar — UI muestra banner de error |
| `/os/tareas` | Igual |
| `/os/dashboard` KPIs pipeline/tareas | Fallan en `Promise.allSettled` — resto del dashboard sigue |

No afecta a Fase 2D (documentos), que usa tablas ya existentes.

### Comando exacto (desde repo)

```powershell
cd apps/web
$env:DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB"
pnpm migrate
```

Alternativa documentada para release:

```powershell
cd apps/web
pnpm migrate:prod
```

(`migrate:prod` exige `DATABASE_URL` y llama al mismo `backend/db/migrate.ts`.)

Verificar en logs: `[migrate] run: 281_os_deals_tasks.sql` y `[migrate] done: 281_os_deals_tasks.sql`.

---

## Tablas usadas (Fase 2D)

| Tabla / API | Uso en UI |
|-------------|-----------|
| `nelvyon_outputs` | Entregas — pestaña Entregas, detalle, cliente/proyecto |
| `nelvyon_assets` | Archivos + **Biblioteca** (filtro por asset_type / classification / tags) |
| `contracts` | Contratos workspace (`/api/v1/entities/contracts`) |
| `/api/v1/billing/invoices` | Facturas (solo rol con permiso billing) |

**No se creó** tabla `os_library` ni migración nueva en 2D.

## Endpoints

| Recurso | Base |
|---------|------|
| Entregas | `GET /api/v1/entities/nelvyon_outputs` (+ `/{id}`) |
| Archivos | `GET /api/v1/entities/nelvyon_assets` (+ `/{id}`) |
| Contratos | `GET /api/v1/entities/contracts` (+ `/{id}`) |
| Facturas | `GET /api/v1/billing/invoices` |

Filtros: query JSON `client_id`, `project_id`; filtros locales búsqueda, estado QA, categoría biblioteca.

## Rutas UI

| Ruta | Función |
|------|---------|
| `/os/documentos` | Tabs: Todos, Entregas, Archivos, Contratos, Facturas*, Biblioteca |
| `/os/documentos/{entrega\|archivo\|contrato\|factura}/{id}` | Detalle + enlace archivo si URL en `object_key` / `extra_data` / `pdf_url` |
| Cliente / proyecto detalle | Sección entregas + enlace a documentos filtrado |

\*Facturas solo con permiso billing.

## Biblioteca (honesta)

- Vive como **pestaña Biblioteca** en `/os/documentos` (no ruta `/os/biblioteca` separada).
- Fuente: `nelvyon_assets` marcados como plantilla/recurso por heurística en `libraryMatch.ts` (tags, classification, asset_type).
- Categorías: web, ecommerce, funnel, branding, ads, prompt, recurso, documento — **derivadas en cliente**, no columna DB.
- Si no hay assets etiquetados: empty state real.

## Qué funciona

- Listado unificado con filtros cliente/proyecto/búsqueda/estado
- Detalle entrega (contenido, QA, extra_data URL)
- Detalle archivo/contrato/factura
- Entregas en detalle cliente y proyecto (`OsDeliveriesSection`)
- Enlace externo cuando `object_key` o JSON trae URL http(s)

## Pendiente

- Presigned URL dedicada para `object_key` S3 (hoy solo enlaces http explícitos)
- CRUD documentos desde OS (solo lectura en 2D)
- Tabla `os_library` si se necesitan metadatos de plantilla fuera de assets
- Migración 281 en Railway release pipeline (automatizar)

## Riesgos

- Assets sin URL pública: "Sin enlace de archivo público" (esperado)
- Biblioteca vacía si assets no usan tags/classification de plantilla
- Facturas mezclan dominio billing workspace (no facturación SaaS del cliente final) — coherente con `/os/finanzas`
