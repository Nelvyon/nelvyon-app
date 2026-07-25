# PROJECT_STATUS — NELVYON

> **2026-07-25** — ERP staging closure · tip **`5a36809c`** · deploy **`5965c32b` SUCCESS** · A/B+concurrency+restart **ALL_PASS** · ADR-062 **PREPARED_OFF** · prod migrate **BLOCKED_CEO** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging** | tip **`5a36809c`** · `5965c32b` · mig **519+520** |
| **ERP** | Snapshot SSOT VERIFIED · HTTP A/B VERIFIED · concurrency VERIFIED · relational dual-write **PREPARED_OFF** |
| **Prod ERP** | Runbook ready · **no** migrate · **BLOCKED_CEO** |
| **Evidence** | `erp.persistence_restart_latest.md` · `erp.http_ab_isolation_latest.md` · `erp.concurrency_latest.md` |
| **Legal** | `claimReady` **false** |

SSOT: `HANDOVER.md` · ADR-061 · ADR-062 · `CTO_FINAL_VERIFY.md`
