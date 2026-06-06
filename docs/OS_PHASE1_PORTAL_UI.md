# OS-1-UI-03 — Portal Cliente frontend

Conecta el shell cliente (`NEXT_PUBLIC_BRAND_MODE=client`) con las APIs `/api/v1/portal/*`.

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/client/sign-in` | Login portal (email + password) |
| `/client/accept-invite` | Activación cuenta (`?token=`) |
| `/portal` | Dashboard cliente |
| `/portal/projects` | Lista proyectos |
| `/portal/projects/{id}` | Detalle proyecto + entregables |
| `/portal/deliverables` | Lista entregables |
| `/portal/deliverables/{id}` | Detalle + aprobar / rechazar |

## Auth

- JWT portal en `sessionStorage` (`nelvyon.portal.jwt`)
- `PortalAuthProvider` bootstrap vía `GET /api/v1/portal/me`
- Login: `POST /api/v1/portal/auth/login`
- Invite: `POST /api/v1/portal/auth/accept-invite`
- **No** envía `X-Workspace-Id` (`tenantScoped: false`)

## Estados entregables

| Status | UI |
|--------|-----|
| `published` | Badge “Pending your review” + acciones approve/reject |
| `approved_by_client` | Badge “Approved” |
| `changes_requested` | Badge “Changes requested” + feedback previo |

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `features/client_portal_v1/api.ts` | Cliente API portal |
| `features/client_portal_v1/PortalAuthContext.tsx` | Sesión portal |
| `features/client_portal_v1/hooks.ts` | React Query hooks |
| `features/client_portal_v1/components/*` | UI states, cards, review panel |
| `app/portal/**` | Páginas portal |
| `app/client/sign-in`, `accept-invite` | Auth visual |

## Validación

```bash
cd apps/web
pnpm test -- src/features/client_portal_v1
pnpm typecheck
pnpm build
```

Modo cliente: `NEXT_PUBLIC_BRAND_MODE=client`
