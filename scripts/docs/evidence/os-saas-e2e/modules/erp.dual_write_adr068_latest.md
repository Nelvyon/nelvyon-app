# ERP dual-write staging — ADR-068 activation evidence

> Fecha: **2026-07-26** · coste **0** · prod dual-write/read-flip **OFF** · Pepito untouched

## Activation

| Item | Result |
|------|--------|
| Tip live | **`428c6c913c4d`** |
| Deploy SUCCESS (pre-rollback) | `3e6adef5` / tip with `ErpRelationalMirror` |
| `NELVYON_ERP_RELATIONAL_DUAL_WRITE` | **1** during equivalence run |
| `NELVYON_ERP_RELATIONAL_READ` | **0** (no read-flip) |
| Prod flags | **ABSENT** |

## Gates executed

| Gate | Result | Evidence |
|------|--------|----------|
| Backup / SSOT JSONB | PASS (snapshots remain SSOT) | mig 520 |
| Dual-write mirror same TX | PASS | `ErpRelationalMirror` + live tip |
| JSONB ↔ relational equivalence | **PASS** `snapCount=1 relCount=1` same supplier id | `erp.dual_write_staging_latest.md` |
| HTTP Tenant A/B isolation | **ALL_PASS** | `erp.http_ab_isolation_latest.md` |
| Concurrency | **ALL_PASS** | `erp.concurrency_latest.md` |
| Unit mirror fail-closed | **34 PASS** (mirror+prep+canary suite subset) | vitest |
| Read flip | **OFF** (not activated) | flag=0 |
| Rollback flag OFF | Railway var **SET=0** · unit skip mirror PASS · live process pickup **queued** (BUILDING redeploys) | this file |
| Soak / long load | **NOT claimed** (short smoke only; no paid soak) | honesty |

## Verdict

| Layer | Estado |
|-------|--------|
| Staging dual-write | **IMPLEMENTED_VERIFIED** (equivalence + A/B + concurrency + tip live) |
| Staging read-flip | **OFF** / PREPARED |
| Production dual-write | **OFF** |
| claimReady | **false** |

## Rollback

```
NELVYON_ERP_RELATIONAL_DUAL_WRITE=0
NELVYON_ERP_RELATIONAL_READ=0
# redeploy staging · verify no new erp_suppliers rows for new mutations
# restore DUAL_WRITE=1 when ready
```
