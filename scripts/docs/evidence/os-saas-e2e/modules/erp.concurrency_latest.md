# ERP concurrency / idempotency (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T16:01:30.036Z |
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
- PASS `seed.inventory`: sku=CONC-a1ea167a loc=dbd6d4b0-c0eb-4c26-8e0d-a0198dafec9d
- PASS `conc.receive.same_key`: stock=10 statuses=201,201 moveIds=d3f237dd-a27a-4670-a6d8-a09c1335d9d0|d3f237dd-a27a-4670-a6d8-a09c1335d9d0
- PASS `conc.receive.distinct`: +15 stock=25 responses_okish=3
- PASS `conc.reserve.parallel`: avail=0 reserved=25 a=201/ok b=400/INSUFFICIENT_STOCK
- PASS `conc.pr.same_key`: id=b34ea30e-f20a-4d8d-aeef-98460027b2fa a=201 b=201
- PASS `conc.mo.parallel`: mos=2 a=201 b=201
