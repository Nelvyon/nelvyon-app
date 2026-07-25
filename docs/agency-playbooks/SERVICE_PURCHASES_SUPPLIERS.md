# SERVICE — Purchases & Suppliers (ERP core)

> Capability: `purchases_suppliers_core` · Core: `backend/agency/PurchasesSuppliersCore.ts` · Team: `svc_automations_crm`
> Flag: none (in-memory core always available) · payments/accounting: permanently `BLOCKED_SCOPE`
> Catálogo OS: Block 26 (parent wires `OsCatalogV1` / index — not this playbook)

## Primary

Zero-cost, multi-tenant procurement domain for agency/SaaS tenants: suppliers + contacts,
purchase requests (PR), RFQ/quotes, purchase orders (PO), goods receipts (partial allowed),
supplier returns, incidents, attachment **metadata**, approval policy by role, and an
append-only audit timeline. No network I/O. No binary file store. No money movement.

## Estado

- **Core: IMPLEMENTED (in-memory).** `PurchasesSuppliersCore` — every method requires
  `tenantId`; empty tenant and cross-tenant access throw `TENANT_MISMATCH` / `NOT_FOUND`.
- **Payments / accounting: `BLOCKED_SCOPE`, permanently.** `recordPayment()` ALWAYS throws.
  There is no bank, tax, payroll, or ledger API in this module. Fields such as
  `unitPriceCents`, `approvalLimitCents`, and `maxApproveCents` are **informational /
  policy gates only** — they never authorize or record a payment.
- **Attachments: metadata only.** `AttachmentMeta.sha256` is a placeholder; no blob storage.
- Parent owns catalog wiring, DB migrations, and HTTP routes — this playbook documents
  the domain core only.

## Modelo canónico

| Entity | Lifecycle / notes |
|--------|-------------------|
| `Supplier` | `active` / `inactive` · `paymentTermsNote` is free text (non-payment) · `contacts[]` |
| `PurchaseRequest` | `draft` → `submitted` → `approved` / `rejected` · lines `{sku,qty,uom}` |
| `Rfq` | Linked to approved PR · invited suppliers · quotes with informational `unitPriceCents` |
| `PurchaseOrder` | From selected quote · `draft` → `issued` → `partially_received` → `received` → `closed` \| `cancelled` |
| `GoodsReceipt` | Partial OK · **immutable** once posted (`posted: true`) |
| `SupplierReturn` | Against a receipt line · qty + reason |
| `Incident` | Linked to PO or goods receipt |
| `AttachmentMeta` | Filename + sha256 placeholder · no binary |
| `AuditEntry` | Append-only `{at, tenantId, actorId, action, entityType, entityId, detail}` |
| `ApprovalPolicy` | `maxApproveCents` by role `requester` / `manager` / `admin` |

Defaults: requester `0`, manager `50_000`, admin `1_000_000` (cents, informational).

## Idempotency

`createPR`, `createPO`, and `postReceipt` accept optional `idempotencyKey`. A second call
with the same key returns the original entity (no duplicate).

## QA / evidencia

Tests: `backend/agency/__tests__/PurchasesSuppliersCore.test.ts`

- Supplier + contact + category
- Full flow: PR → approve → RFQ → compare quotes → PO → partial → full receipt → return
- Tenant isolation (A cannot read/modify B)
- Approval over limit → `APPROVAL_LIMIT_EXCEEDED`
- `recordPayment` → `BLOCKED_SCOPE`
- Idempotent double-submit
- Non-empty audit trail
- `assertPurchasesCoreIntegrity()` → `ok: true` (payments blocked, empty tenant rejected, isolation)

Conceptual critical-flow QA score target: **≥ 90** when integrity asserts pass and the E2E
procurement path above is green.

## Forbidden

`recordPayment` · bank/tax/payroll APIs · silent mocks that claim money moved · binary
attachment storage · Pepito DB as supplier master · cross-tenant reads · mutating a posted
goods receipt.

## Próximo paso EXACTO

1. Parent: wire `purchases_suppliers_core` into `OsCatalogV1` / agency index (out of scope here).
2. Parent: DB migrations + BFF routes when persistence is scheduled (not this block).
3. Until then: in-memory core + vitest evidence only — no payment/accounting expansion.
