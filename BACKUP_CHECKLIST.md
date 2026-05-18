# Checklist de respaldo — NELVYON

Guía corta para no perder trabajo y mantener el repo sano.

## Al empezar el día

1. Abre **siempre** la carpeta raíz del monorepo en Cursor (no subcarpetas sueltas).
2. Instala o actualiza dependencias del frontend (desde la raíz):

   ```bash
   pnpm install
   ```

3. Activa el entorno Python del backend si lo usas (`.venv`) e instala deps si hace falta (`pip install -r requirements.txt` en `backend/`).
4. Test rápido (smoke + auditoría RBAC + mensajes; unos minutos):

   ```bash
   pnpm test:fast
   ```

## Antes de cerrar el día

1. Vuelve a pasar el test rápido:

   ```bash
   pnpm test:fast
   ```

2. Revisa cambios y haz commit (mensaje claro, en español o inglés según tu equipo):

   ```bash
   git status
   git add -A
   git commit -m "descripción breve del cambio"
   ```

3. **Copia de seguridad de la carpeta del proyecto** (recomendado además de Git):
   - Copia toda la carpeta `app_v181` (o el nombre que tengas) a un disco externo, carpeta `Backups`, o nube que controles.
   - No copies `node_modules` ni `.venv` si quieres ahorrar espacio: con `git` + `pnpm install` + venv se recupera.

## Comandos útiles (referencia)

| Objetivo        | Comando              |
|----------------|----------------------|
| Frontend dev   | `pnpm dev:frontend`  |
| Backend dev    | `pnpm dev:backend`   |
| Lint frontend  | `pnpm lint`          |
| Tests rápidos  | `pnpm test:fast`     |

Más detalle portable: `cursor-setup.md`.
