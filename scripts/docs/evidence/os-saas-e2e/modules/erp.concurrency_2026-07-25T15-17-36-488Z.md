# ERP concurrency / idempotency (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T15:17:36.488Z |
| Verdict | **ALL_PASS** |
| Base | https://ideal-victory-staging.up.railway.app |
| Critical fails | 0 |

## Architecture honesty

- Mutations go through `with*Persistence` → `SELECT … FOR UPDATE` on `erp_domain_snapshots`.
- Concurrent HTTP calls are **serialized** at row lock; correctness (idempotency, non-negative stock) is the gate.
- Snapshot `409 CONFLICT` may appear under stale optimistic version; not required on every race when FOR UPDATE wins.
- Multi-replica: same Postgres lock covers all replicas; **second app replica not provisioned** (0€).

## Results

- PASS `auth`: userId=920e1939-de70-46ca-a351-cdf3f2b6a90b
- PASS `saas-tenant`: dashboard OK
- PASS `seed.inventory`: sku=CONC-5aa18a54 loc=31edc91d-2d58-48ab-87d6-7855f46c3553
- PASS `conc.receive.same_key`: stock=10 statuses=201,201 moveIds=55e54f28-8756-4bc0-ba70-44fee74bfa1c|55e54f28-8756-4bc0-ba70-44fee74bfa1c
- PASS `conc.receive.distinct`: +15 stock=25 responses_okish=3
- PASS `conc.reserve.parallel`: avail=0 reserved=25 a=201/ok b=400/INSUFFICIENT_STOCK
- PASS `conc.pr.same_key`: id=93bdf754-4e3d-49c0-bcd4-1ab81ff2bc42 a=201 b=201
- PASS `conc.mo.parallel`: mos=2 a=201 b=201
