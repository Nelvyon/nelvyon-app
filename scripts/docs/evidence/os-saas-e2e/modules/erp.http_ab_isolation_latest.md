# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T13:52:22.436Z |
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

- PASS `A.register`: erp-ab-A-fc8a8632@nelvyon.test
- PASS `A.onboard`: tenant=c549055e-952a-4e5a-88d7-440164ad51c0
- PASS `B.register`: erp-ab-B-632794ed@nelvyon.test
- PASS `B.onboard`: tenant=deed313e-7f1d-44c1-ac66-87995dfb3050
- PASS `A.seed.supplier`: 04f7a6bb-7bd2-48ea-8e8b-5f1510452523
- PASS `A.seed.inventory`: sku=SKU-A-326f7f23 loc=efc0322c-d972-4c44-8347-22e19dd28133 qty=100
- PASS `A.seed.mfg`: bom=8c1eccfd-a674-48cb-88c4-dcd8b2e1625f mo=eca651ae-1d67-4f84-8bb1-92421912169a
- PASS `A.seed.projects`: 646e7fc8-4031-4cd3-8907-5498e85b0481
- PASS `B.seed.own_supplier`: c3aaa689-044b-451d-829b-e66675389c81
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
