# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — SQL SSOT tip `9ca0cf29` · web `git_sha` restored · IA OFF · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** |
| **Tip repo** | `a0c46fe7` (docs sync) · **SHA vivo web** `9ca0cf29a5e5` (SSOT code deploy; no 2º redeploy) |
| **Web prod** | deploy `7d625161` **SUCCESS** · live `git_sha=9ca0cf29a5e5` · ready **200** |
| **FastAPI prod** | deploy `25e2109d` **SUCCESS** · health 200 · shared DB + `SKIP_ALEMBIC=1` |
| **app.nelvyon.com** | DNS/SSL/health **PASS** · apex+app `git_sha` match tip |
| **Automations unified** | Auth path **200** (evidence `.release-logs/automations-401-closure-20260722.txt`) · unauth probe **401** expected |
| **SQL SSOT** | ADR-002/039 · gate ALL_PASS · pytest 5/5 · post-elite 508–518 · DB 517/518 verified |
| **KI-020** | **KI020_PASS** (re-smoke app Origin 2026-07-22) |
| **portal-packs** | **SKIP** this pass (`STAGING_QA_PASSWORD` absent locally) · prior ALL_PASS on closure evidence |
| **IA / OpenAI / MCP / SM / Router / QR / payouts / campañas** | **OFF** · OpenAI key **revoked** · coste **0** |
| **Beta packs** | Permanecen **beta** |
| **claimReady** | **false** |

---

## Próximo paso EXACTO

1. CEO batch IA opcional: mesh Option A + canaries staging (`docs/ops/CANARY_IA_FLAGS.md`) — **no** activar OpenAI/OpenClaw/payouts.  
2. Legal: firmar checklist campañas (`docs/COMPLIANCE_COMPANY_DB_CHECKLIST.md`) antes de cualquier envío.  
3. Ops opcional: re-run portal-packs con `STAGING_QA_PASSWORD` (GH secret) para refrescar evidencia post-`9ca0cf29`.

SSOT: `docs/CTO_FINAL_CLOSURE_AUDIT.md` · `docs/CTO_FINAL_VERIFY.md`
