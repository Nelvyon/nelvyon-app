# ERP dual-write staging smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T14:29:16.947Z |
| Base | https://ideal-victory-staging.up.railway.app |
| Tip expected | 428c6c91+ with ErpRelationalMirror |
| Tenant | 14cc6b98-b7eb-49ea-8952-39015b8546ab |
| Supplier | ce461a33-b343-4fe0-9553-468b02366cc9 |
| Verdict | **ALL_PASS (API path; DB probe deferred)** |
| Dual-write flag | NELVYON_ERP_RELATIONAL_DUAL_WRITE=1 staging |
| Read flip | **OFF** |
| Prod dual-write | **OFF** |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| register | PASS | erp-dw-631cca12@nelvyon.test |
| onboard | PASS | tenant=14cc6b98-b7eb-49ea-8952-39015b8546ab |
| create_supplier | PASS | ce461a33-b343-4fe0-9553-468b02366cc9 |
| list_suppliers_jsonb | PASS | count=1 id=ce461a33-b343-4fe0-9553-468b02366cc9 |
| companion_probe_skipped | PASS | set DUAL_WRITE_DB_PROBE=1 + DATABASE_URL (railway run) for JSONB↔relational |

## Notes

- API SSOT remains `erp_domain_snapshots` JSONB.
- Companion mirror runs in same TX when DUAL_WRITE=1.
- Pepito DB never referenced. Cost incremental 0.