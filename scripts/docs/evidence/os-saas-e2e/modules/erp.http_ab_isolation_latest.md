# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T16:32:28.140Z |
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

- PASS `A.register`: erp-ab-A-60eb9f41@nelvyon.test
- PASS `A.onboard`: tenant=a2127bd6-0a30-4e72-960e-d3bce7aa1a70
- PASS `B.register`: erp-ab-B-42c337c9@nelvyon.test
- PASS `B.onboard`: tenant=4a8c18c4-829b-4cc0-a7dc-25e5fbd69b86
- PASS `A.seed.supplier`: ca13da2f-e287-4327-80aa-3452ab0f48ce
- PASS `A.seed.inventory`: sku=SKU-A-860ec770 loc=faa48ebe-ae5c-4b2e-809e-d9a9886d3d9d qty=100
- PASS `A.seed.mfg`: bom=445bb735-c30e-4fd5-9c25-10d403d1342b mo=9fe82c18-a231-4981-82ac-7fdcbdbe7614
- PASS `A.seed.projects`: b58e00d2-95e5-4172-8ccb-717924650102
- PASS `B.seed.own_supplier`: 7f9df414-fb19-40ca-9cc0-00c4bd24b477
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
