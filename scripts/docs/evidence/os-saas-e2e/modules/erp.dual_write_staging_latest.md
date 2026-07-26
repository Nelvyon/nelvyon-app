# ERP dual-write staging smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T14:29:29.583Z |
| Base | https://ideal-victory-staging.up.railway.app |
| Tip expected | 428c6c91+ with ErpRelationalMirror |
| Tenant | 4709ba16-8ec2-4975-aa11-91ce123ecf85 |
| Supplier | 9501f9f6-bce8-4b7b-a729-3136a4725134 |
| Verdict | **IMPLEMENTED_VERIFIED (staging dual-write equivalence)** |
| Dual-write flag | NELVYON_ERP_RELATIONAL_DUAL_WRITE=1 staging |
| Read flip | **OFF** |
| Prod dual-write | **OFF** |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| register | PASS | erp-dw-c589ee47@nelvyon.test |
| onboard | PASS | tenant=4709ba16-8ec2-4975-aa11-91ce123ecf85 |
| create_supplier | PASS | 9501f9f6-bce8-4b7b-a729-3136a4725134 |
| list_suppliers_jsonb | PASS | count=1 id=9501f9f6-bce8-4b7b-a729-3136a4725134 |
| companion_equivalence | PASS | erp_suppliers.id=9501f9f6-bce8-4b7b-a729-3136a4725134 snapCount=1 relCount=1 |

## Notes

- API SSOT remains `erp_domain_snapshots` JSONB.
- Companion mirror runs in same TX when DUAL_WRITE=1.
- Pepito DB never referenced. Cost incremental 0.