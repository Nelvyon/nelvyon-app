# ERP concurrency / idempotency (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T15:46:57.753Z |
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
- PASS `seed.inventory`: sku=CONC-7b0fd1ae loc=0104f857-4ad4-4371-a10f-df24f774f3a5
- PASS `conc.receive.same_key`: stock=10 statuses=201,201 moveIds=1ff9b6f4-5eaf-45d1-882f-be9f9067392e|1ff9b6f4-5eaf-45d1-882f-be9f9067392e
- PASS `conc.receive.distinct`: +15 stock=25 responses_okish=3
- PASS `conc.reserve.parallel`: avail=0 reserved=25 a=201/ok b=400/INSUFFICIENT_STOCK
- PASS `conc.pr.same_key`: id=2228d009-64f0-4bee-97a4-52233647fffc a=201 b=201
- PASS `conc.mo.parallel`: mos=2 a=201 b=201
