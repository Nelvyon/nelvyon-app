# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Automations 401 root-cause fixed (JWT sync) · mig 517 · FastAPI DB unify in progress · IA OFF

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (`claimReady: false`) |
| **SHA tip** | `f2535cde` (FastAPI create_all duplicate ignore) · web tip `692fe75c`+ |
| **app.nelvyon.com** | DNS/SSL/health **PASS** |
| **Automations 401** | **Causa:** FastAPI `JWT_SECRET` ≠ web → `Invalid or expired authentication token`. **Fix ops:** sync JWT_SECRET (ADR-038). BFF deja de devolver 401 auth. |
| **Automations post-auth** | 500 por `workspaces.timezone` missing + FastAPI DB distinta. **mig 517** aplicada en Postgres web · columns **OK**. FastAPI `DATABASE_URL` alineado a web · deploy fix DuplicateTableError `f2535cde`. |
| **IA / OpenAI / MCP / SM / payouts / campañas** | **OFF** · OpenAI key **revoked** |
| **Beta packs** | Permanecen **beta** |
| **Costes** | **0** |

---

## Próximo paso EXACTO

1. Confirmar deploy FastAPI SUCCESS con shared DB + create_all fix · re-probar `/api/platform/automations/reporting/unified` → 200 sin error Unauthorized.  
2. CEO batch IA opcional (`docs/ops/CANARY_IA_FLAGS.md`) — no activar.  
3. Legal: checklist campañas.

SSOT: `docs/CTO_FINAL_CLOSURE_AUDIT.md`
