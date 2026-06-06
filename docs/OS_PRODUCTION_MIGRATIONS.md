# Migraciones OS en producción (281 + 282)

Objetivo: que funcionen en producción:

- `/os/pipeline` → `os_deals`
- `/os/tareas` → `os_tasks`
- `/os/finanzas` y `/os/dashboard` (gastos/flujo) → `os_expenses`, `os_cashflow`

**Railway no ejecuta migraciones en el arranque del contenedor** (`CMD node server.js` solo). Hay que aplicarlas **antes o en cada release**.

---

## Comando exacto (recomendado desde tu máquina)

PowerShell (sustituye la URL de Postgres de producción — pooler Supabase o Railway Postgres):

```powershell
cd c:\Users\Asus\Downloads\app_v181\apps\web

$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

pnpm migrate:prod
```

Equivalente:

```powershell
pnpm migrate
```

Ambos llaman a `backend/db/migrate.ts`. Solo aplican archivos **no** presentes en `_migrations` (idempotente).

### Logs esperados (si faltaban 281 y 282)

```
[migrate] run: 281_os_deals_tasks.sql
[migrate] done: 281_os_deals_tasks.sql
[migrate] run: 282_os_expenses_cashflow.sql
[migrate] done: 282_os_expenses_cashflow.sql
[migrate] all migrations complete
```

Si ya estaban aplicadas:

```
[migrate] skip: 281_os_deals_tasks.sql
[migrate] skip: 282_os_expenses_cashflow.sql
```

---

## Validar después de migrar

```powershell
cd c:\Users\Asus\Downloads\app_v181\apps\web
$env:DATABASE_URL="postgresql://..."
pnpm validate:os-migrations
```

Salida OK:

```
[validate-os] OK _migrations: 281_os_deals_tasks.sql
[validate-os] OK _migrations: 282_os_expenses_cashflow.sql
[validate-os] OK tabla os_deals (filas: 0)
[validate-os] OK tabla os_tasks (filas: 0)
...
```

Alternativa SQL en psql: `backend/db/scripts/validate_os_tables.sql`

---

## Railway — release command (automatizado)

En `apps/web/railway.json` está configurado:

```json
"deploy": {
  "releaseCommand": "pnpm exec tsx ../../backend/db/migrate.ts"
}
```

**Requisitos:**

1. Variable `DATABASE_URL` en el servicio Railway (misma DB que usa la app).
2. Redeploy o “Deploy” nuevo: Railway ejecuta el release command **antes** de levantar el contenedor.
3. Revisar logs del paso **Release** en el deployment (no solo Runtime).

Si el release falla (falta `tsx`, red, URL), usa el comando manual desde tu PC (sección anterior).

**No** añadir migrate al `CMD` del Dockerfile: repetiría migraciones en cada restart y alarga el arranque.

---

## Qué NO hace este flujo

- No toca web pública, marketing ni SaaS.
- No ejecuta migraciones `312`/`313` (saas_deals) — solo OS 281/282.
- No borra datos legacy.

---

## Si algo falla en UI tras migrar

| Síntoma | Causa probable |
|---------|----------------|
| Pipeline/tareas error 500 | Tablas ausentes → migrar + validar |
| Finanzas sin gastos pero resto OK | Solo falta 282 |
| Dashboard KPIs pipeline vacíos | Normal si no hay filas en `os_deals` — “Sin datos todavía” |

Reiniciar el servicio Railway **no** sustituye ejecutar migrate.
