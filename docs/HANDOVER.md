# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Automations unified **200** · JWT sync + mig 517/518 · IA OFF · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** |
| **Tip repo** | `644a1556` (+ mig 518 pending commit) |
| **FastAPI prod** | deploy `0460249e` **SUCCESS** · health 200 · shared DB + `SKIP_ALEMBIC=1` |
| **app.nelvyon.com** | DNS/SSL/health **PASS** |
| **Automations unified** | **200** · portal-packs **ALL_PASS** · evidence `.release-logs/automations-401-closure-20260722.txt` |
| **KI-020** | **KI020_PASS** |
| **IA / OpenAI / MCP / SM / Router / QR / payouts / campañas** | **OFF** · OpenAI key **revoked** |
| **Beta packs** | Permanecen **beta** |
| **Costes** | **0** |

---

## Próximo paso EXACTO

1. CEO batch IA opcional: mesh Option A + canaries staging (`docs/ops/CANARY_IA_FLAGS.md`) — **no** activar OpenAI/OpenClaw/payouts.  
2. Legal: firmar checklist campañas (`docs/COMPLIANCE_COMPANY_DB_CHECKLIST.md`) antes de cualquier envío.  
3. Ops opcional: redeploy `@nelvyon/web` desde git para restaurar `git_sha` en `/api/health/live` (ahora null por `railway up`).

SSOT: `docs/CTO_FINAL_CLOSURE_AUDIT.md`
