# Private Surface Policy (apps/web)

This project now supports two runtime surface modes via `NEXT_PUBLIC_BRAND_MODE`:

- `internal` (default): full private backoffice.
- `client`: restricted white-label client portal surface.

## Route policy

Implemented in `src/core/platform/surfacePolicy.ts`.

- `INTERNAL_ONLY` (never exposed in `client` mode):
  - `/sign-in`
  - `/crm`
  - `/automations`
  - `/os`
  - `/billing`
  - `/settings`
  - `/example`

- `CLIENT_PORTAL_ALLOWED`:
  - `/`
  - `/inbox/tickets`
  - `/campaigns`
  - `/help`
  - plus nested details under the prefixes above (e.g. `/inbox/tickets/:id`, `/campaigns/:id`, `/help/:module`)
  - optional `/inbox/tickets/new` only when `NEXT_PUBLIC_CLIENT_PORTAL_TICKET_CREATE=1`

## Module policy

In `client` mode, only these modules are allowed:

- `inbox`
- `campaigns`
- `help`

Everything else is blocked in navigation and in route guards.

## Client ticket creation switch

- `NEXT_PUBLIC_CLIENT_PORTAL_TICKET_CREATE=1` enables request creation UI and `/inbox/tickets/new` in client mode.
- Default is disabled.

## Branding policy

Implemented in `src/core/platform/brand.ts`:

- `internal`: app name is `NELVYON`.
- `client`: app name is `NEXT_PUBLIC_CLIENT_BRAND_NAME` (fallback `Client Portal`).

## Guardrails enabled

- `ProtectedLayout` blocks internal-only routes/modules in `client` mode.
- `AppShell` hides internal controls in `client` mode:
  - `AuthDebugPanel`
  - `WorkspaceSelector`
  - `HelpBotPanel`
- Navigation is filtered to allowed client modules only.

