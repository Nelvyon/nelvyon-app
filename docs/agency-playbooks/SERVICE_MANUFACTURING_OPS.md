# SERVICE — Manufacturing / Quality / Maintenance / PLM

> Capability: `manufacturing_ops_core` (Block 28) · Core: `backend/agency/ManufacturingOpsCore.ts`  
> Flag: none for the in-memory core · IoT: permanently `BLOCKED_EXTERNAL` / `PREPARED_OFF`  
> Catálogo OS: **not registered in this change** (core-only; no catalog/index/migrations touch)

## Primary

Modular manufacturing operations domain — BOM versioning, work centers/routing, manufacturing
orders (consume + production with scrap/merma), quality plans/inspections with NC→CAPA,
asset maintenance calendar, and PLM documents with change-request approve/reject (version bump).
Fully in-memory and multi-tenant. No shop-floor PLC/MQTT, no ERP vendor adapter, no DB tables.

## Estado

- **Core: VERIFIED (in-memory).** `ManufacturingOpsCore` implements the domain with tenant-scoped
  maps and audit trail. Vitest: `backend/agency/__tests__/ManufacturingOpsCore.test.ts`.
- **IoT: `BLOCKED_EXTERNAL`, permanently (`PREPARED_OFF`).** `IoTAdapter.connect()` ALWAYS throws
  `BLOCKED_EXTERNAL`. There is no environment flag that flips this. Real device mesh requires a
  manual code rewrite after explicit CEO ops approval — never a runtime toggle.
- This core is **not** the OS `manufactura` marketing agent fleet. Those remain satellite LLM
  agents and must not be treated as MRP/QC/PLM.

## Modelo canónico

| Entidad | Notas |
|---------|--------|
| `Bom` | `productSku` + `version` + lines `{componentSku, qty, uom}` · status `draft\|approved\|obsolete` · `approveBom()` |
| `WorkCenter` | `code`, `name` |
| `Routing` | `productSku` + `version` + operations `{seq, workCenterId, name, stdMinutes}` |
| `ManufacturingOrder` | draft → released → in_progress → completed\|cancelled · `consumeComponents()` · `reportProduction(qtyGood, qtyScrap)` |
| `QualityPlan` / `Inspection` | pass/fail · evidence refs = URLs/strings only (no binary) |
| `NonConformance` + `CorrectiveAction` | NC only from failed inspection · CAPA linked to NC |
| `Asset` + `MaintenanceOrder` | `preventive\|corrective` · `scheduleAt` · calendar via `listMaintenanceCalendar()` |
| `PlmDocument` | change request approve bumps `version` · reject keeps version · `traceabilityLinks` |
| `AuditEntry` | every critical mutation audited per tenant |
| `IoTAdapter` | connect always blocked |

## Hard rules

1. **Tenant isolation** — tenant A never reads/mutates tenant B.
2. **No consume without release** — `consumeComponents` requires MO `released` or `in_progress`.
3. **Scrap ≤ produced good** — cumulative scrap cannot exceed cumulative good (`SCRAP_EXCEEDS_PRODUCED`).
4. **No fake IoT** — `IoTAdapter.connect` always `BLOCKED_EXTERNAL`.
5. **Integrity** — `assertManufacturingCoreIntegrity()` proves IoT block + isolation + hard rules.

## QA / evidencia

Critical path (treat as QA ≥ 90 when integrity + happy path pass):

1. BOM approve → MO release → consume → produce with scrap → complete  
2. Inspection fail → NC → CAPA  
3. Preventive maintenance on calendar  
4. PLM change approve bumps version  
5. IoT `BLOCKED_EXTERNAL`  
6. Tenant A/B isolation  
7. `assertManufacturingCoreIntegrity()` → `{ ok: true, violations: [] }`

## Forbidden

Real IoT/MQTT/PLC connections · binary evidence blobs in inspections · silent cross-tenant reads ·
consuming components on draft/cancelled/completed MOs · registering catalog `IMPLEMENTED_VERIFIED`
without evidence · conflating OS manufactura marketing agents with this core · DB migrations in
this block (explicitly out of scope).

## Rollback

See `MANUFACTURING_OPS_ROLLBACK_PLAN` in the core module: keep IoT blocked, keep core in-memory
until CEO approves persistence/API, do not promote OS manufactura agents as MRP.

## Próximo paso EXACTO

1. Parent/CEO: decide catalog registration (`PREPARED_OFF` until staging evidence) — **not done here**.
2. Optional later: SaaS persistence + `/api/saas/*` only after inventory/BOM dependency blocks settle.
3. Until then: in-memory core + vitest only; IoT remains permanently blocked.
