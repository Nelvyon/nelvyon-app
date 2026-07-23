# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-23** — Mesh Option A **local PASS** · Railway node WAITING_TS_AUTHKEY · prod OFF · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** |
| **Mesh Option A** | PC Tailscale + Ollama **privado PASS** · peer_count **0** · staging prep flags · **WAITING** auth key CEO |
| **Staging** | `NELVYON_MESH_OPTION_A=1` · `OLLAMA_HOST` Tailscale IP · AI master **0** hasta `TS_AUTHKEY` + redeploy |
| **Prod IA / mesh** | Keys **ABSENT** |
| **OpenAI / OpenClaw / payouts / campañas** | **OFF** · coste **0** |
| **Funnel/Serve/exit/subnet** | **Forbidden** (no activados) |
| **claimReady** | **false** |

---

## Próximo paso EXACTO

1. CEO: crear auth key ephemeral (clics exactos en `docs/ops/MESH_OPTION_A_STAGING.md` §1–2) → pegar **solo** en Railway **staging** `ideal-victory` como `TS_AUTHKEY` → set `OLLAMA_CONFIGURED=1` + `NELVYON_AI_ENABLED=1` → redeploy staging.  
2. Verificar `tailscale status` peer + probe Ollama desde staging.  
3. Legal: `docs/COMPLIANCE_COMPANY_DB_CHECKLIST.md` (sigue bloqueando claimReady).

SSOT: `docs/ops/MESH_OPTION_A_STAGING.md` · `docs/CTO_FINAL_VERIFY.md`
