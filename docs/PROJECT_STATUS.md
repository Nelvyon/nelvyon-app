# PROJECT_STATUS — NELVYON

> **2026-07-25** — **ADR-061 VERIFIED staging** · tip **`9e931f08`** · deploy **`794662d7` SUCCESS** · mig **519+520** · restart **ALL_PASS** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging live** | https://ideal-victory-staging.up.railway.app · tip **`9e931f08`** · deploy **`794662d7` SUCCESS** · `AUTONOMOUS_ALLOW_OPENAI=0` · `_migrations` **519+520** |
| **Catalog** | **OsCatalogV1 v1.7.0** · ERP 26–29+35 **IMPLEMENTED_VERIFIED** · ADR-061 Postgres SSOT |
| **ERP honesty** | Postgres `erp_domain_snapshots` SSOT · process-memory **not** SSOT when DB · staging restart **ALL_PASS** · prod migrate **BLOCKED** until CTO · **no** Odoo/finance · payments/IoT/signature/health **BLOCKED_*** |
| **Evidence** | `erp.cores_synthetic_latest.md` **ALL_PASS** · `erp.persistence_restart_latest.md` **ALL_PASS** |
| **Legal** | `claimReady` **false** · `claimReadyLegal` **false** |
| **BLOCKED_SCOPE** | ERP payments / bank / tax / GL / cost accounting |
| **BLOCKED_EXTERNAL** | IoT · e-signature · OAuth/spend/publish/Twilio · iOS · multi-region COST |
| **BLOCKED_CEO** | prod IA canary |
| **BLOCKED_LEGAL** | mass-send · Pepito · regulated health |

SSOT: `HANDOVER.md` · `CTO_FINAL_VERIFY.md` · `OS_ELITE_STATE_MATRIX.md` · ADR-061 · ADR-060
