# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Post-automations SQL SSOT harden · mig 517/518 DB **PASS** · IA OFF · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** |
| **Tip repo** | *(actualizar tras commit de este cierre; sync-handover-metadata)* |
| **FastAPI prod** | deploy `0d5a7ce9` **SUCCESS** (tip `b8a5f921`) · shared DB + `SKIP_ALEMBIC=1` |
| **app.nelvyon.com** | DNS/SSL/health live/ready **200** · `git_sha` **null** hasta 1× redeploy git |
| **Automations unified** | **200** · portal-packs **ALL_PASS** · evidence `.release-logs/automations-401-closure-20260722.txt` |
| **SQL SSOT** | ADR-002/039 · gate `validate-sql-alembic-ssot` **ALL_PASS** (files + DB probe) · pytest duplicate-guard **5/5** · post-elite **508–518 OK** |
| **Mig prod** | `_migrations` **517** + **518** · `workspaces.timezone` · `workflows.is_active` |
| **KI-020** | **KI020_PASS** (evidencia previa; re-smoke si creds) |
| **IA / OpenAI / MCP / SM / Router / QR / payouts / campañas** | **OFF** · OpenAI key **revoked** (coste **0**) |
| **Beta packs** | Permanecen **beta** |
| **claimReady** | **false** |

---

## Próximo paso EXACTO

1. Tras push de tip SQL-SSOT: **una** `railway redeploy --service "@nelvyon/web" --from-source -y` → verificar `git_sha` 12-char en `/api/health/live`.  
2. CEO batch IA opcional: mesh Option A + canaries staging (`docs/ops/CANARY_IA_FLAGS.md`) — **no** activar OpenAI/OpenClaw/payouts.  
3. Legal: firmar checklist campañas (`docs/COMPLIANCE_COMPANY_DB_CHECKLIST.md`) antes de cualquier envío.

SSOT: `docs/CTO_FINAL_CLOSURE_AUDIT.md` · `docs/CTO_FINAL_VERIFY.md`
