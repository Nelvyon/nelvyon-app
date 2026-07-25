# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T15:17:01.686Z |
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

- PASS `A.register`: erp-ab-A-c4d30736@nelvyon.test
- PASS `A.onboard`: tenant=9c8aff78-248d-426b-89fe-ac8d6c4aaa24
- PASS `B.register`: erp-ab-B-af603b6a@nelvyon.test
- PASS `B.onboard`: tenant=0ec3ebd2-739b-4b2c-9d32-173398008563
- PASS `A.seed.supplier`: 9086ddf1-a09a-4c03-9dac-ce529f1e3b8b
- PASS `A.seed.inventory`: sku=SKU-A-5f209872 loc=1c06dfeb-f5cb-4731-b84a-3cbba47560fd qty=100
- PASS `A.seed.mfg`: bom=ff0a4dae-15ae-48c6-a88c-fcf2421b8fba mo=cd19bdf2-f627-4ef2-9239-e93f1f111ad2
- PASS `A.seed.projects`: 5e5deb3d-81dc-433d-8f3d-eaf493fe6512
- PASS `B.seed.own_supplier`: 655e2bf7-31dc-4958-9d71-c8f0855a18d2
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
