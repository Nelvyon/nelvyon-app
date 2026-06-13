# NELVYON Backend (FastAPI)

API Python para CRM, campañas, tickets, workflows y workspace del panel principal.

## Cómo preparar staging

Objetivo: que los flujos **A–D** (crear cliente, campaña, ticket y lead desde formulario) funcionen en  
`https://ideal-victory-staging.up.railway.app` usando el panel principal, **sin** `/saas`.

### Servicios Railway implicados

| Servicio | URL / nombre |
|----------|----------------|
| **Web (Next.js)** | `ideal-victory-staging` → `https://ideal-victory-staging.up.railway.app` |
| **API Python (FastAPI)** | `nelvyon-app-production` → `https://nelvyon-app-production.up.railway.app` |

La web de staging llama a la API Python vía `NEXT_PUBLIC_API_BASE_URL`.  
La API Python debe usar **la misma base de datos Supabase staging** que la web.

---

### Paso 1 — Variables en el servicio **API Python**

Railway → proyecto → servicio **API Python** (`nelvyon-app-production`) → **Variables** → pega exactamente:

```env
ENVIRONMENT=staging
DATABASE_URL=postgresql+asyncpg://postgres.mvktercdceydhaesngmv:Budylolaginger20.@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
JWT_SECRET=<copiar del servicio Web staging — ver abajo>
JWT_SECRET_KEY=<mismo valor que JWT_SECRET>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
```

**`JWT_SECRET` — cómo obtenerlo (no está en el repo):**

1. Railway → servicio **Web staging** (`ideal-victory-staging`) → **Variables**
2. Busca la variable **`JWT_SECRET`**
3. Copia su valor **tal cual** y pégalo en la API Python en **`JWT_SECRET`** y **`JWT_SECRET_KEY`**

> La web firma el login con `JWT_SECRET`. La API Python valida ese token con la misma clave.  
> Si no coinciden, verás **401** o **500** en `/api/v1/workspace/list`.

Guarda variables y **redeploy** el servicio API Python (Railway lo hace al guardar).

---

### Paso 2 — Ejecutar el script de preparación de BD

Railway → servicio **API Python** → **Shell** (consola):

```bash
python scripts/prepare_staging.py
```

Debe terminar con `Exit: READY` y mostrar tablas `nelvyon_clients`, `nelvyon_campaigns`, `helpdesk_tickets` en **OK**.

El script:

1. Aplica migraciones Alembic (`upgrade head`)
2. Crea tablas híbridas si faltan (`workspaces`, `workspace_members`, …)
3. Crea **Mi Workspace** + `workspace_members` (owner) para cada usuario en `nelvyon_users` que aún no tenga workspace
4. Comprueba integridad de esquema A–D

---

### Paso 3 — Comprobar que la API responde

Sustituye `<TOKEN>` por el JWT que obtienes al hacer login en staging  
(`POST https://ideal-victory-staging.up.railway.app/api/auth/login`).

**Health (sin auth):**

```text
GET https://nelvyon-app-production.up.railway.app/health
→ 200 {"status":"healthy"}
```

**Workspaces:**

```text
GET https://nelvyon-app-production.up.railway.app/api/v1/workspace/list
Authorization: Bearer <TOKEN>
→ 200 con array no vacío, p. ej. [{"id":1,"name":"Mi Workspace","slug":"default",...}]
```

**Crear cliente (flujo A):**

```text
POST https://nelvyon-app-production.up.railway.app/api/v1/entities/nelvyon_clients
Authorization: Bearer <TOKEN>
X-Workspace-Id: <id del workspace del paso anterior>
Content-Type: application/json

{"business_name":"Cliente prueba staging","sector":"Tech"}
→ 201
```

---

### Paso 4 — Verificar en el panel (sin tocar código)

1. Abre `https://ideal-victory-staging.up.railway.app/sign-in`
2. Inicia sesión con tu usuario de staging
3. **CRM → Clientes → Nuevo** → guarda → debe aparecer en la lista
4. **Campañas → Nueva** → guarda
5. **Inbox → Tickets → Nuevo** → guarda
6. **Formularios** → envía un lead de prueba

---

### Variables opcionales recomendadas (API Python)

```env
FRONTEND_APP_URL=https://ideal-victory-staging.up.railway.app
PYTHON_BACKEND_URL=https://nelvyon-app-production.up.railway.app
```

En el servicio **Web staging**, confirma también:

```env
NEXT_PUBLIC_API_BASE_URL=https://nelvyon-app-production.up.railway.app
```

---

### Healthcheck (API Python staging)

| Endpoint | Uso | Respuesta OK |
|----------|-----|--------------|
| `GET https://nelvyon-app-production.up.railway.app/health` | **Liveness** (Railway) | `200` `{"status":"healthy"}` |
| `GET https://nelvyon-app-production.up.railway.app/health/ready` | **Readiness** (+ DB) | `200` y `"database":"ok"` |

---

### Desarrollo local

Ver **`README-dev-Windows.md`** en la raíz del repo.

### Demo seed A+B+C+D (local)

Ver **`DEMO-SEED-ABCD.md`**.
