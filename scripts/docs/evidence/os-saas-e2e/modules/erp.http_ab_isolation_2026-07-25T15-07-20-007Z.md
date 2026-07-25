# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T15:07:20.007Z |
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

- PASS `A.register`: erp-ab-A-d0bb93e5@nelvyon.test
- PASS `A.onboard`: tenant=abd2621a-a0a9-4eb8-8400-649f878f9eca
- PASS `B.register`: erp-ab-B-d1558ef7@nelvyon.test
- PASS `B.onboard`: tenant=dd878889-2a3a-4928-8b77-61c551012de4
- PASS `A.seed.supplier`: 231b8031-46d4-4deb-8a1a-8428d1cbdc37
- PASS `A.seed.inventory`: sku=SKU-A-9d432ab9 loc=35fbeae2-d9cf-4c15-b2cb-7253f8af59e6 qty=100
- PASS `A.seed.mfg`: bom=5c5eca7a-6174-4d37-806b-a85d08a01096 mo=9c7a3616-d52b-44bd-acc0-05866e996204
- PASS `A.seed.projects`: 3628a06f-fb51-4b4e-be5e-8c94970bf033
- PASS `B.seed.own_supplier`: 2b480702-4c52-48fb-aa3f-896d2bbce419
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
