# NELVYON — Desarrollo local en Windows

Flujo estable: **dos terminales**, puertos fijos **8000** (API) y **3000** (SPA).

> Producto principal en producción: `apps/web` (Next.js).  
> Desarrollo rápido del panel legacy: `frontend/` (Vite).

## Requisitos

| Herramienta | Mínimo | Comprobar |
|-------------|--------|-----------|
| Node.js | 18+ | `node -v` |
| pnpm | 10+ | `pnpm -v` |
| Python | 3.10+ | `python --version` |
| Git | 2.x | `git --version` |

**Regla de cookies:** abre siempre **`http://127.0.0.1:3000`** (no mezclar `localhost` y `127.0.0.1`).

## Configuración inicial (una vez)

1. Clona el repo en `C:\Proyectos\Nelvyon\nelvyon-app` (o tu ruta).
2. Copia variables de desarrollo si no existe `.env` en la raíz:

```powershell
cd C:\Proyectos\Nelvyon\nelvyon-app
Copy-Item .env.example .env   # solo si .env no existe; edita valores locales
```

3. Instala dependencias:

```powershell
pnpm install
pip install -r backend\requirements.txt
```

El archivo **`.env`** en la raíz ya carga el backend vía `load_env_files()` (SQLite local por defecto).

## Terminal 1 — Backend (FastAPI)

```powershell
cd C:\Proyectos\Nelvyon\nelvyon-app
pnpm run dev:backend
```

Comprobaciones:

- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

## Terminal 2 — Frontend (Vite legacy)

```powershell
cd C:\Proyectos\Nelvyon\nelvyon-app
pnpm run dev:frontend
```

App: http://127.0.0.1:3000

`frontend/.env.development.local` fija el proxy a `127.0.0.1:8000` y habilita login demo en dev.

## Next.js (producción / SaaS principal)

```powershell
cd C:\Proyectos\Nelvyon\nelvyon-app
pnpm -C apps/web dev
```

Variables: ver `apps/web/.env.example`. Para Postgres/Supabase en local, define `DATABASE_URL` en `.env` o `apps/web/.env.local`.

## Seed demo (opcional)

Con el mismo `DATABASE_URL` que usa el backend:

```powershell
cd C:\Proyectos\Nelvyon\nelvyon-app\backend
python scripts\seed_demo_abcd.py --reset
```

Ver `backend/DEMO-SEED-ABCD.md`.

## Servicios cloud (GitHub / Railway / Supabase)

No bloquean el dev local con SQLite. Para desplegar o conectar BD remota:

- **GitHub:** `git` en PATH + cuenta configurada (`git config user.name` / `user.email`).
- **Railway:** variables en el dashboard; ver `docs/RAILWAY_DEPLOY_CHECKLIST.md`.
- **Supabase:** `DATABASE_URL` con URL service_role en `.env` (nunca anon key en backend).

## Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| `Settings object has no attribute database_url` | Asegura `.env` en raíz con `DATABASE_URL` y reinicia backend. |
| Sesión / cookies raras | Usa solo `127.0.0.1`, no `localhost`. |
| Puerto 8000 ocupado | Mata el proceso o cambia puerto en uvicorn y `VITE_PROXY_API_TARGET`. |
| `git` no reconocido | Instala [Git for Windows](https://git-scm.com/download/win) y reinicia la terminal. |
