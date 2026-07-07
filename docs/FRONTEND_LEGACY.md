# `frontend/` — Legacy (no tocar en hardening SaaS/OS)

**Estado (jul 2026):** directorio legacy pre–App Router. El producto activo vive en `apps/web/`.

| Aspecto | Detalle |
|---------|---------|
| Uso en prod | **No** — deploy Railway usa `@nelvyon/web` (`apps/web`) |
| Scripts root | `dev:frontend`, `lint` legacy en `package.json` — solo dev local |
| Rutas activas | Páginas Vite/React bajo `frontend/src/pages/`; no enlazadas al shell Next.js |
| Helpdesk API | `frontend/src/lib/api.ts` apunta a APIs antiguas; SaaS real usa `/api/saas/helpdesk` (V2) |

**Política:** no eliminar en FASE 2.1 (blast radius alto, ~178 archivos). No modificar salvo migración explícita a `apps/web`.

**SSOT:** `CLAUDE.md` — `frontend/` en desuso.
