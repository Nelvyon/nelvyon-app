# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T15:46:21.401Z |
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

- PASS `A.register`: erp-ab-A-cb84792b@nelvyon.test
- PASS `A.onboard`: tenant=efbdc1dc-41ed-48e4-a03a-7aba61f24d02
- PASS `B.register`: erp-ab-B-802151e0@nelvyon.test
- PASS `B.onboard`: tenant=01d9a39b-13c7-473e-9da9-8e4a7f77224f
- PASS `A.seed.supplier`: bf9a42c3-458e-475a-b3f7-daf341788a65
- PASS `A.seed.inventory`: sku=SKU-A-5fff3aee loc=0e98936e-3aa3-4fff-8da2-a952b4422f9e qty=100
- PASS `A.seed.mfg`: bom=9dfe9a47-69ed-49a2-97c1-c2366fc20d21 mo=4cd10724-0e43-4d88-b3af-225defe6919e
- PASS `A.seed.projects`: 1a5dc11a-6289-4be3-ad0a-9968a3b2d249
- PASS `B.seed.own_supplier`: c5ca29b9-0060-4767-8bcc-3751fe42962f
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
