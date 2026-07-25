# SERVICE — Inventory / Warehouses / Traceability

> Capability: `inventory_warehouses_core` · Core: `backend/agency/InventoryWarehousesCore.ts` · Block **27**
> Flag: none (in-memory core always available) · cost accounting / GL: **out of scope**
> Catálogo OS: **not wired** this block (catalog/index/migrations intentionally untouched)

## Primary

Canonical multi-tenant inventory domain — products (SKU/UOM/variants), warehouses +
locations, immutable stock moves, lots/serials traceability, reservations, physical
counts with approval-gated adjusts, min-stock alerts, and append-only audit — fully
in-memory and synthetic. No persistence, no cost/GL, no external WMS connectors.

## Estado

- **Core: VERIFIED (in-memory).** `InventoryWarehousesCore` enforces tenant isolation
  (`TENANT_MISMATCH` hard-fail on cross-tenant entity access), move idempotency,
  over-reserve rejection (`INSUFFICIENT_STOCK`), and adjust-requires-approval via
  physical count `draft → submitted → approved`.
- **StockMove is immutable** after append (`Object.freeze`). Balances are materialized
  projections maintained with non-negative invariants (`available`, `reserved`,
  `inTransit`).
- **No cost accounting / GL** in this module — quantity + traceability only.
- Catalog / agency index / DB migrations **not** modified in Block 27.

## Modelo canónico

| Entidad | Notas |
|---------|--------|
| `Product` | `sku`, `name`, `uom`, `variants[{sku, attrs}]`, `tenantId` |
| `Warehouse` / `Location` | location scoped by `warehouseId` + `code` |
| `StockBalance` | `available`, `reserved`, `inTransit` per location+SKU |
| `StockMove` | IMMUTABLE · types `receive\|adjust\|transfer\|pick\|return\|reserve\|release` · `idempotencyKey` |
| `Lot` / `Serial` | tenant-scoped · attached to moves for trace chains |
| `Reservation` | `orderRef`, qty, status `held\|released\|consumed` |
| `PhysicalCount` | `draft → submitted → approved` posts adjust |
| `MinStockRule` | `sku` + `warehouseId` + `minQty` → `listAlerts()` |
| `AuditEntry` | append-only per tenant |

## Flujo de stock

1. **receive** — increases `available` at `toLoc`
2. **reserve** — `available → reserved` (cannot exceed available)
3. **pick** — against reservation (`reserved`↓, status `consumed`) or free available
4. **transfer** — atomic `fromLoc → toLoc` available move
5. **return** — increases `available` at `toLoc` (e.g. post-sale return)
6. **adjust** — **only** via approved physical count (unapproved adjust → `APPROVAL_REQUIRED`)

## Traceability

`traceLot(tenantId, lotId)` / `traceSerial(tenantId, serialId)` return the immutable
move chain (e.g. purchase receive → sale pick → customer return) using optional
synthetic `traceRef` fields (`purchase:…`, `sale:…`, `return:…`).

## QA / evidencia

Tests: `backend/agency/__tests__/InventoryWarehousesCore.test.ts`

- receive → reserve → pick → transfer → return
- lots/serials purchase→sale→return chain
- min stock alert
- over-reserve rejected
- double idempotent receive
- physical count approval → adjust
- cross-tenant isolation A/B (read + mutate)
- `assertInventoryCoreIntegrity()`

## Forbidden

Cost/GL postings · mutating stock moves after append · posting adjust without approved
physical count · cross-tenant stock visibility · silent over-reserve · catalog/index
wiring without a dedicated follow-up block · Pepito as inventory source.

## Próximo paso EXACTO

1. Keep Block 27 as in-memory verified core until a persistence/API surface is scheduled.
2. Do **not** wire into `OsCatalogV1` / agency `index` until product decides inventory is
   an OS-facing capability (explicit follow-up).
3. Optional later: Postgres projection of moves + RLS — not started here.
