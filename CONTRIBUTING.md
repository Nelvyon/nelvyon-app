# NELVYON 100/100 Quality Standard

This repository uses a hard quality baseline:

- The demo core is already at 100/100.
- New work must never degrade closed X-EXEC blocks.
- Every new or extended screen must pass mini X-EXEC before demo/production use.

## X-EXEC definitions

- **X-EXEC**: Full checklist-driven hardening cycle for critical screens/journeys.
- **mini X-EXEC**: Same quality contract, scoped to one new/extended screen with minimum closed scope.
- **PASA**: Screen/journey accepted only after real state validation and green gates.

## PASA acceptance criteria

For every screen/journey, PASA means:

- No ambiguous states (`loading`, `error`, `404`, `403`).
- No dead routes or broken internal links.
- No misleading copy or overpromises.
- RBAC is explicit and honest (who can see/do what and why).
- Clear save/refetch feedback when actions/filters happen.
- Demo-safe end-to-end behavior (no visible breakpoints in normal flow).

## Mandatory gates (always)

Before closing any screen or merge request that touches screens/flows:

- `pnpm typecheck`
- `pnpm lint`
- Relevant tests for touched domain/surface
- `pnpm gate`

All must be green.

## Mandatory closure format (1→5)

Every X-EXEC/mini X-EXEC closure must include:

1. NO PASA checks detected
2. Changes applied (UX/copy/flow)
3. Files touched
4. Tests/gates executed
5. Concrete demo/confidence improvement

## Merge policy for new screens/features

No merge for new or extended screens unless:

1. Scope is explicitly closed (no infinite expansion)
2. mini X-EXEC completed with PASA
3. Mandatory gates are green
4. Closure format (1→5) is documented in PR/task notes

## Current stage lock

- V2-A2 internal analytics (`/analytics/revenue`, `/analytics/revenue/deals`, `/analytics/tickets`, `/analytics/campaigns`) is considered stable.
- Further analytics expansion requires a new mini X-EXEC cycle per screen.
