# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — ADR-056 elite absolute audit · **AUDIT_FIXES_LOCAL** · tip pending push of ADR-056 fixes · base tip **`6364c28c`** / runtime staging still ADR-055 lineage · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **AUDIT_FIXES_LOCAL** · **CONDITIONAL_READY** (**NOT READY** · no claimReady · no prod) |
| **Tip / deploy staging** | **TBA** (ADR-056 fixes uncommitted · base **`6364c28c`**) · runtime staging still ADR-055 **`53149384`** · deploy **`e514bbd7`** SUCCESS · https://ideal-victory-staging.up.railway.app |
| **Tests locales** | agency **109 PASS** · tsc **0** · CampaignsLegal+saasCampanias+saasEnv+mcpProductive+catalog availability **PASS** · eslint changed routes **0** |
| **13 packs + auditor (staging live)** | **ALL_PASS** ADR-055 (11 ADR-054 + automations + reputation) — runtime unchanged pending ADR-056 deploy |
| **P0 audit fix (local)** | Campaign launch blocked by `getCampaignLaunchBlockReason` while `claimReadyLegal=false` (test bypass only) |
| **P1 audit fixes (local)** | `isOpenAiSpendAllowed` gates chat+ai-copy · `mcp.write` no longer invented · shared-memory scopes split · `meta-ads-pack` → beta **OAuth OFF** |
| **Catalog** | **v1.2.0** (`OS_CATALOG_V1_VERSION`) · automations · reputation · sm_mcp_synthetic_staging → **IMPLEMENTED_VERIFIED (staging)** |
| **OpenClaw** | staging_mock deepened · prod canary doc **`PENDING_CEO`** |
| **Visual** | `creative_direction` + `VISUAL_PROVIDER_DECISION_MATRIX` · spend **OFF** |
| **Social oficial NELVYON** | **PREPARED_OFF** · `NelvyonOfficialSocialOps` · 8 cuentas **PENDING_CEO** |
| **SM / MCP** | staging synthetic flags **ON** · productivo **0** · `OLLAMA_HOST=http://100.102.207.30:11434` (Tailscale CGNAT private — not public) |
| **Legal campañas** | gate reforzado · `DATOS_PEPITO_LICENSE_DOSSIER` · `claimReadyLegal=false` · Pepito **forbidden** · mass-send **legally blocked** |
| **Staging URL** | https://ideal-victory-staging.up.railway.app · `ideal-victory` Online · `AI_ENABLED=1` staging only · `AUTONOMOUS_ALLOW_OPENAI=0` |
| **Prod** | untouched · Railway briefly switched for flag read — `NELVYON_*` OpenAI/MCP/SM/OpenClaw/visual vars **ABSENT** (default OFF) · restored to staging + re-linked `ideal-victory` |

### Evidencia

`scripts/docs/evidence/os-saas-e2e/modules/automations_reputation_e2e_latest.md` (ADR-055 E2E · staging runtime)  
`scripts/docs/evidence/os-saas-e2e/modules/auditor.all_packs_e2e_latest.md` (ADR-054 staging)  
`docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md`  
`docs/ops/CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md`  
`docs/ops/DATOS_PEPITO_LICENSE_DOSSIER.md`  
`docs/ops/CEO_OPENCLAW_PROD_CANARY_REQUEST.md`  
`docs/ops/VISUAL_PROVIDER_DECISION_MATRIX.md`

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

1. **CEO:** abrir/conectar **8 cuentas sociales oficiales** — `docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md`.  
2. **Legal:** enviar dossier Pepito + obtener licencia comercial escrita — `docs/ops/DATOS_PEPITO_LICENSE_DOSSIER.md` + `docs/ops/CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md` (bloquea `claimReady`).  
3. **CEO:** revisar solicitud OpenClaw prod canary — `docs/ops/CEO_OPENCLAW_PROD_CANARY_REQUEST.md` (**PENDING_CEO**).  
4. **No** READY · **no** prod OpenClaw/OpenAI/MCP productivo/SM productiva/payouts/campañas/visual spend.

SSOT: `OS_ELITE_STATE_MATRIX.md` · `OS_CATALOG_V1.md` · ADR-056
