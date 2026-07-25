# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T16:00:48.010Z |
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

- PASS `A.register`: erp-ab-A-450eb0d9@nelvyon.test
- PASS `A.onboard`: tenant=0c0fa3a1-9b18-4f1e-b5f9-bbd4ebed0fb7
- PASS `B.register`: erp-ab-B-59c39753@nelvyon.test
- PASS `B.onboard`: tenant=df93cd03-775b-4cbe-a902-6df7738908ce
- PASS `A.seed.supplier`: 6d76dca8-e9a0-4f8e-9a1d-4fbf57e62000
- PASS `A.seed.inventory`: sku=SKU-A-162df5b1 loc=c6089c38-c384-4890-8710-442af5026154 qty=100
- PASS `A.seed.mfg`: bom=deb4f945-a485-4686-970a-b46c755def54 mo=93a1af7e-7ab1-4990-841f-0ce635de718b
- PASS `A.seed.projects`: 3adde44d-8390-468e-b6c3-a4029ce80eb9
- PASS `B.seed.own_supplier`: cfab710f-eeca-4e8f-b205-9a7a784a7e47
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
