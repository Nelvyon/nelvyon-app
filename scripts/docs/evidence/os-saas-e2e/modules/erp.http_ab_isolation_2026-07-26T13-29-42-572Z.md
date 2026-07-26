# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T13:29:42.572Z |
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

- PASS `A.register`: erp-ab-A-7eb89c66@nelvyon.test
- PASS `A.onboard`: tenant=8a5715c2-01e8-4e0c-815f-5619a7a6ee8f
- PASS `B.register`: erp-ab-B-6a3f91ae@nelvyon.test
- PASS `B.onboard`: tenant=f3c11ff3-255f-4a97-8a72-e748e65b0447
- PASS `A.seed.supplier`: 9236fb4d-db90-4d49-b919-486fc31b2fc3
- PASS `A.seed.inventory`: sku=SKU-A-99d7bdac loc=7fb4dada-0517-406e-bdd1-0692124b3d1b qty=100
- PASS `A.seed.mfg`: bom=e887c08f-6ee6-4028-b699-269b24b32a4d mo=f584a2fa-7685-416d-81bb-d71a0d3660fb
- PASS `A.seed.projects`: 1717499c-38ec-441e-a581-0c4550ce7c4a
- PASS `B.seed.own_supplier`: 440d6743-43f8-4370-8173-4be5f1d6b1db
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
