# NELVYON — Desarrollo local en Windows (DX “copiar y pegar”)

Este documento fija el **modo arranque estable** en Windows: **dos terminales**, puertos **fijos**, sin depender de `start_app_v2.sh` (Bash + `lsof`/`nc` es frágil en Windows).

> Reglas de calidad de producto y entrega: ver `CONTRIBUTING.md` (NELVYON 100/100 + X-EXEC/mini X-EXEC).

## Requisitos previos

- **Python 3.10+** instalado y en el `PATH` (comprobar: `python --version`).
- **Node.js 18+** y **npm** (comprobar: `node -v`, `npm -v`).
- Navegador: usa **siempre el mismo host** para la app y la API en dev: **`http://127.0.0.1:3000`** (no mezclar `localhost` y `127.0.0.1` si usas cookies de sesión).

## Regla de oro (cookies + proxy)

- El frontend (Vite) sirve en **`127.0.0.1:3000`** y reenvía **`/api`** al backend en **`127.0.0.1:8000`**.
- Abre la SPA en **`http://127.0.0.1:3000`** para que las cookies `Set-Cookie` del backend coincidan con el origen del navegador.

## Terminal 1 — Backend (FastAPI)

Abre **PowerShell** en la raíz del repo y ejecuta **en orden** (puedes copiar el bloque completo):

```powershell
cd C:\Users\Asus\Downloads\app_v181\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

$env:ENVIRONMENT = "dev"
$env:JWT_SECRET_KEY = "cambiar-en-tu-maquina-solo-dev"
$env:ADMIN_EMAIL = "admin@local.dev"
$env:ADMIN_PASSWORD = "CambiarPasswordSeguro123!"
$env:DATABASE_URL = "sqlite+aiosqlite:///./nelvyon_local.db"

uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Comprobaciones backend

- Documentación interactiva: **http://127.0.0.1:8000/docs**
- Salud: **http://127.0.0.1:8000/health**

### Demo / seed A+B+C+D (workspaces W1/W2)

Documentación completa: **`backend/DEMO-SEED-ABCD.md`**. Con las mismas variables de entorno que uses para `uvicorn` (sobre todo **`DATABASE_URL`** y **`ADMIN_EMAIL`** / **`ADMIN_USER_ID`**), desde `backend`:

```powershell
cd C:\Users\Asus\Downloads\app_v181\backend
.\.venv\Scripts\Activate.ps1
python scripts/seed_demo_abcd.py --reset
```

La primera carga puede hacerse sin `--reset`; para forzar datos frescos en los workspaces demo (`nelvyon-demo-w1` / `nelvyon-demo-w2`), usa **`--reset`**.

Si `Activate.ps1` falla por política de ejecución:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Terminal 2 — Frontend (Vite)

Otra ventana de **PowerShell**:

```powershell
cd C:\Users\Asus\Downloads\app_v181\frontend
npm install
npm run dev
```

Por defecto el dev server escucha en el puerto **3000** (ver `frontend/vite.config.ts`, variable opcional `VITE_PORT`).

### Comprobaciones frontend

- App: **http://127.0.0.1:3000**
- Tras login (SSO / demo / invitación según tu `.env`), el panel SaaS suele estar en rutas bajo **`/saas/...`** (ej. **`http://127.0.0.1:3000/saas/dashboard`**).

## Observabilidad (logs OBS-ABCD-1)

- Cada petición recibe **`X-Request-ID`** (o reutiliza el que envíes si es UUID válido). Ese valor aparece en logs como **`request_id`** junto con **`workspace_id`** y **`user_id`** cuando la ruta pasó por auth + workspace.
- **Formato de log:** variable de entorno **`LOG_FORMAT`**:
  - `json` — una línea JSON por evento (recomendado en **prod/staging**; por defecto se usa JSON si `ENVIRONMENT` es `production`/`prod`/`staging`).
  - `text` — línea legible con `request_id=… workspace_id=… user_id=…` (por defecto en **dev/test**).
- **Local:** los logs van a consola y a `backend/logs/app_YYYYMMDD_HHMMSS.log`. Tras reproducir un caso (crear contacto, ticket, etc.):

```powershell
cd C:\Users\Asus\Downloads\app_v181\backend
# último fichero de log
Get-ChildItem logs\app_*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { $_.FullName }
# ejemplo: buscar por request_id (PowerShell)
Select-String -Path logs\app_*.log -Pattern "a1b2c3d4-" | Select-Object -Last 5
```

- **Servidor Linux:** `tail -f backend/logs/app_*.log | jq .` si el formato es JSON, o `grep request_id=…` en modo texto.

Opcional en la misma terminal del backend antes de `uvicorn`:

```powershell
$env:LOG_FORMAT = "json"   # forzar JSON en dev
```

## Variables opcionales (frontend)

Si el backend **no** está en el puerto 8000, crea `frontend/.env.development.local`:

```env
VITE_PROXY_API_TARGET=http://127.0.0.1:PUERTO
```

El proxy de Vite usa por defecto **`http://127.0.0.1:8000`** (ver `vite.config.ts`).

Para el botón **“Acceso Administrador (demo)”** solo en desarrollo:

```env
VITE_DEMO_AUTH_ENABLED=true
```

(En build de producción el demo no se ofrece; ver `frontend/src/lib/auth.ts`.)

## Operador único / sin exponer a internet

- Arranca backend con **`--host 127.0.0.1`** (solo esta máquina).
- No reenvíes puertos en el router; no publiques la IP.
- Para uso en LAN privada más adelante, cambia host con cuidado (firewall) y documenta el riesgo.

## Problemas frecuentes

| Síntoma | Qué hacer |
|--------|-----------|
| API 401 / sesión extraña | Misma URL siempre: **`127.0.0.1`**, no mezclar con `localhost`. |
| `pip` / `python` no encontrado | Instalar Python desde python.org y marcar “Add to PATH”. |
| Puerto 8000 ocupado | Cambiar puerto en `uvicorn` **y** `VITE_PROXY_API_TARGET` en `.env.development.local`. |
| Puerto 3000 ocupado | `set VITE_PORT=3001` antes de `npm run dev` y abrir **http://127.0.0.1:3001**. |

## Relación con `start_app_v2.sh`

El script asigna puertos dinámicos y lanza procesos en segundo plano; en Windows es más fiable **este flujo de dos terminales** con puertos fijos **8000 + 3000**.
