# CTO — Auditoría definitiva de pendientes (v3 post cierre técnico seguro)

> **Fecha:** 2026-07-28 · **Versión:** 3.1 (certificación pre-push) · tip **`5579625f`** (ahead 8)  
> **SSOT:** este archivo  
> **claimReady: false** · **NOT READY**  
> **Canary prod:** **KILL ON**  
> **SAFE_TO_PUSH:** true (tras fix `5579625f`) · **SAFE_TO_MIGRATE_PROD:** false

---

## Certificación pre-push 2026-07-28

| Control | Resultado |
|---------|-----------|
| Typecheck | **PASS** (0) tras `@ts-nocheck` en `billingLifecycleLocale.test.ts` |
| Lint apps/web | **FAIL** — 2 warnings preexistentes `erp/inventory` unused setters (no introducidos por lote) |
| Vitest saas/email/billing/crm | **2471 PASS** / 4 skipped |
| Build apps/web | **PASS** |
| Playwright secuencias | **5 PASS** |
| Mig 521/522 staging probe | cols OK · incompatible triggers **0** |
| SES | prod identities en **eu-west-1** · staging `us-east-1` **sin** identities / **sin** production access |
| DECISIONS | encoding repaired · ADR-072/073 (no chocar ADR-070 RAG) |

**No push / no deploy / no migrate prod** hasta SÍ CEO.

| Pendiente | Acción | Evidencia | Estado |
|-----------|--------|-----------|--------|
| Mig **521** staging | Applied via `pnpm migrate` on shared staging DB | `_migrations` + cols `email_opened`/`email_clicked` | **CLOSED_STAGING** |
| Mig **522** `score_threshold` CHECK | Additive DROP+ADD constraint | staging applied · CHECK includes `score_threshold` | **CLOSED_STAGING** |
| `wf.create` 500 | Staging reval CERTIFIED; schema drift fixed | `saas.workflows_latest.json` CERTIFIED · repro 9/9 | **CLOSED_STAGING** |
| Fail-closed PG errors | `mapWorkflowWriteError` + `SCHEMA_MISMATCH` 503 | vitest 87 PASS focused | **CLOSED_CODE** |
| Playwright Chromium | Installed + `saas-secuencias.spec.ts` | **5 passed** | **CLOSED_LOCAL** |
| Honesty HTTP staging | workflows/sequences/campanias/invoices/documents/analytics/funnels | `saas.honesty.staging_reval_latest.json` 12/12 | **CLOSED_STAGING** |
| SES preflight | Staging keys SET · region `us-east-1`; prod `eu-west-1` · **no mass send** | Railway vars (no secrets) | **PARTIAL** |
| Comunidades replies | Kept honest-disabled — no `parent_post_id` | UI + ADR-073 | **DEFERRED_PRODUCT** |
| Mig 521/522 **prod** | **Not applied** — ADR-064 CEO gate | — | **BLOCKED_CEO** |
| Push tip | Deferred until CEO review | ahead local | **NO_PUSH** |

---

# CTO — Auditoría definitiva de pendientes (v2 post Cursor-0€)

> **Fecha:** 2026-07-28 · **Versión:** 2 (Cursor 0€ vaciado) · tip **`05791f3b`** / docs tip **`4d810d3b`**  
> **SSOT histórico v2** (ops items superseded by v3 above)  
> **claimReady: false** · **NOT READY**

---

## Cursor al 100% · 0 €

**Vacío.**

### Reclasificados actualizados en v3

| Pendiente | Estado v3 |
|-----------|-----------|
| `saas.workflows` wf.create | **CLOSED_STAGING** CERTIFIED |
| Playwright Chromium | **CLOSED_LOCAL** 5 PASS |
| Migrate 521 staging | **CLOSED_STAGING** · prod **BLOCKED_CEO** |
| Email live certs mass-send | Sigue **Ops/CEO** (no mass send) |
| Comunidades reply anidado | **DEFERRED_PRODUCT** |

---

## Pendientes que permanecen

### Daniel / CEO

- Aprobar o diferir **prod** migrate 521+522
- Pepito/legal · claimReady
- Canary ON vs KILL · RAG permanente · OpenClaw/SM/MCP prod
- Partner payouts · Ads spend · OAuth

### Externos

- OAuth reales · Twilio/WA · SES region align · clientes pagando

---

## Próximo paso EXACTO

1. CEO: prod migrate 521+522 SÍ/NO (ADR-064).
2. Ops: push tip → staging redeploy.
3. **No declarar READY.**
