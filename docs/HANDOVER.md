# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — ADR-056 elite absolute audit · tip **`fd81c8bc`** · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (**NOT READY** · no claimReady · no prod) |
| **Tip / deploy staging** | tip **`fd81c8bc`** (docs `823159f2`) · deploy **`4dff8950` SUCCESS** · https://ideal-victory-staging.up.railway.app |
| **Tests locales** | agency **109 PASS** · tsc **0** · P0/P1 suites **PASS** · eslint rutas tocadas **0** |
| **13 packs + auditor** | **ALL_PASS** ADR-055 (staging) |
| **P0 corregido** | `launchCampania` bloqueado si `claimReadyLegal=false` |
| **P1 corregidos** | OpenAI spend gate · scopes MCP/SM honestos · meta-ads **beta OAuth OFF** |
| **Catalog** | v1.2.0 · automations/reputation/SM-MCP synthetic → **IMPLEMENTED_VERIFIED (staging)** |
| **Social oficial** | **PREPARED_OFF** · 8 cuentas PENDING_CEO |
| **SM/MCP/OpenClaw/Visual** | staging synthetic/mock ON · productivo **OFF** |
| **Ollama** | `http://100.102.207.30:11434` (Tailscale privado) |
| **Legal** | claimReady **false** · Pepito forbidden · campañas hard-block |
| **Prod** | flags productivos **ABSENT/OFF** |

### Evidencia

`automations_reputation_e2e_latest.md` · `auditor.all_packs_e2e_latest.md` · ADR-056 tests (CampaignsLegal, saasEnv, mcpProductive)

### Rollback staging

```
NELVYON_PACK_INDEPENDENT_AUDITOR=0
NELVYON_OPENCLAW_BRIDGE_ENABLED=0
NELVYON_OPENCLAW_STAGING_MODE=0
NELVYON_VISUAL_GENERATION_ENABLED=0
NELVYON_SHARED_MEMORY_ENABLED=0
NELVYON_MCP_PRODUCTIVE_ENABLED=0
NELVYON_SHARED_MEMORY_STAGING=0
NELVYON_MCP_STAGING_SYNTHETIC=0
NELVYON_AUTOMATIONS_OPS_PACK=0
NELVYON_REPUTATION_OPS_PACK=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_CEO_PARTNER_PAYOUTS=0
```

---

## Próximo paso EXACTO

1. **CEO:** 8 cuentas sociales — `docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md`
2. **Legal:** dossier Pepito + licencia escrita — `docs/ops/DATOS_PEPITO_LICENSE_DOSSIER.md`
3. **CEO:** OpenClaw canary review — `docs/ops/CEO_OPENCLAW_PROD_CANARY_REQUEST.md`
4. **No** READY · **no** flags productivos en producción

SSOT: `CTO_FINAL_VERIFY.md` · `AUDITORIA_TECNICA_ABSOLUTA.md` · ADR-056
