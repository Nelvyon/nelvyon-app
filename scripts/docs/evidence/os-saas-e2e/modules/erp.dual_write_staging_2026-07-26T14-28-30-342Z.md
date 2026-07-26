# ERP dual-write staging smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T14:28:30.341Z |
| Base | https://ideal-victory-staging.up.railway.app |
| Tenant | n/a |
| Supplier | n/a |
| Verdict | **FAIL** |
| Dual-write flag required | NELVYON_ERP_RELATIONAL_DUAL_WRITE=1 on staging |
| Read flip | **OFF** (API SSOT still JSONB snapshots) |
| Prod dual-write | **OFF** |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| register | PASS | erp-dw-ms1w824s@nelvyon.test |
| onboard | FAIL | 400 {"error":"companyName and industry are required for new tenant"} |
| create_supplier | FAIL | 404 {"error":"Tenant not found","code":"NOT_FOUND"} |
| list_suppliers_jsonb | FAIL | count=0 found=false |
| companion_probe_skipped | PASS | set DUAL_WRITE_DB_PROBE=1 + DATABASE_URL (railway run) for JSONB↔relational count |

## Notes

- API SSOT remains `erp_domain_snapshots` JSONB; companion tables mirror when DUAL_WRITE=1.
- Read flip (`NELVYON_ERP_RELATIONAL_READ`) must stay 0 until CEO cutover.
- Pepito DB never referenced.