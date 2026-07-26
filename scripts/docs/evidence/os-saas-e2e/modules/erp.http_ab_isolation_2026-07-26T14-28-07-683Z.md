# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T14:28:07.683Z |
| Verdict | **ALL_PASS** |
| Base | https://ideal-victory-staging.up.railway.app |
| Critical fails | 0 |
| Checks | 20 (pass 20) |

## Honesty

- Two ephemeral SaaS users via `/api/auth/register` + onboarding (JWT → tenant.id).
- `X-Workspace-Id` is **not** used for SaaS ERP isolation (`requireSaasContext`).
- Reserve/receive/MO/timesheet cross-tenant mutate attempts must not succeed.
- Payments / IoT / e-signature remain **BLOCKED_***.

## Results

- PASS `A.register`: erp-ab-A-5720059f@nelvyon.test
- PASS `A.onboard`: tenant=9b5cc48e-9211-4fa9-b531-738abcbfa1c0
- PASS `B.register`: erp-ab-B-645fd231@nelvyon.test
- PASS `B.onboard`: tenant=2f4a68ed-0aab-477d-81ce-122759d4eb76
- PASS `A.seed.supplier`: 9c507b28-eb35-4346-a883-d20292c05b53
- PASS `A.seed.inventory`: sku=SKU-A-01d8b661 loc=695c3545-0011-4972-b7e9-8aaa2aae766f qty=100
- PASS `A.seed.mfg`: bom=e55266a2-67bd-449c-ab60-d6b9ed9fa925 mo=134c0a7c-08f1-4806-9acb-5984c7e54815
- PASS `A.seed.projects`: fb173a04-cbb6-4d77-b588-a00be6697eb9
- PASS `B.seed.own_supplier`: 17e11385-e7d4-4497-8939-8f699738bb49
- PASS `B.isolation.purchases.list`: A supplier absent
- PASS `B.isolation.inventory.list`: A inventory absent
- PASS `B.isolation.mfg.list`: A mfg absent
- PASS `B.isolation.projects.list`: A project absent
- PASS `B.mutate.receive_A_loc`: blocked HTTP 404 code=NOT_FOUND
- PASS `B.mutate.reserve_A_stock`: blocked HTTP 404 code=NOT_FOUND
- PASS `B.mutate.create_mo_A_bom`: blocked HTTP 404 code=NOT_FOUND
- PASS `B.mutate.approve_A_bom`: blocked HTTP 404
- PASS `B.mutate.timesheet_A_project`: blocked HTTP 404 code=NOT_FOUND
- PASS `A.intact_after_B_attacks`: stock available=100 reserved=0
- PASS `A.isolation.purchases.list`: B supplier absent from A
