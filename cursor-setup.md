# Cursor / monorepo NELVYON — guía portable

Todo lo que sigue asume **Node + pnpm** y, para el backend, **Python 3** con dependencias instaladas en `backend/`. No depende de rutas de una máquina concreta.

## Abrir el proyecto

- En Cursor: **File → Open Folder** y elige la **raíz del monorepo** (donde está `package.json` y `pnpm-workspace.yaml`).
- Así el indexado, búsquedas y TypeScript ven `frontend/` y puedes tener scripts unificados.

## Extensiones

- Instala solo extensiones que uses de verdad (TypeScript, ESLint, Python si trabajas el backend).
- Muchas extensiones activas = IDE más lenta y más superficie de fallos.

## Comandos recomendados (desde la raíz)

```bash
pnpm install          # dependencias del workspace (frontend)
pnpm dev:frontend     # Vite / frontend
pnpm dev:backend      # Uvicorn (usa el `python` del PATH; activa .venv antes si aplica)
pnpm lint             # ESLint en frontend
pnpm test:fast        # Pytest mínimo en backend (auditoría, mensajes, smoke ABCD)
```

## Backend (Python)

- Si usas virtualenv en `backend/.venv`, actívalo **antes** de `pnpm dev:backend` o de `pnpm test:fast` en esa misma terminal (PowerShell: `.\backend\.venv\Scripts\Activate.ps1`).
- Variables sensibles: solo en `.env` local; nunca en el repo (ver `.gitignore`).

## Windows 11

- Los scripts `pnpm` usan la shell por defecto de pnpm en Windows; si algo falla, ejecuta el mismo comando dentro de `backend/` o `frontend/` como en la documentación clásica del proyecto.
