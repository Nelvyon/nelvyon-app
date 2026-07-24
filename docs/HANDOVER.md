# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — ADR-055 cierre local · tip **TBA** · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CODE_READY_LOCAL** (no READY · no deploy ADR-055 aún) |
| **Tip / deploy staging** | **TBA** (working tree ADR-055 · push pending) · live staging sigue ADR-054 `980ea216` |
| **Tests locales** | agency **64+ PASS** · `tsc` **0** |
| **11 packs + auditor (staging live)** | **ALL_PASS** ADR-054 (`auditor.all_packs_e2e_latest.md`) |
| **Packs ADR-055** | `automations-ops-pack` + `reputation-ops-pack` wired **beta** · E2E **pending** |
| **Catalog** | **v1.2.0** (`OS_CATALOG_V1_VERSION`) |
| **OpenClaw** | staging_mock deepened · prod canary doc `PENDING_CEO` |
| **Visual** | `creative_direction` + `VISUAL_PROVIDER_DECISION_MATRIX` · spend **OFF** |
| **Social oficial NELVYON** | **PREPARED_OFF** · `NelvyonOfficialSocialOps` · checklist CEO |
| **SM / MCP** | synthetic harness código listo · flags staging **not set** · productivo **0** |
| **Legal campañas** | gate reforzado · `DATOS_PEPITO_LICENSE_DOSSIER` · `claimReadyLegal=false` · Pepito **forbidden** |
| **Staging URL** | https://ideal-victory-staging.up.railway.app |
| **Prod** | untouched · OpenAI/payouts/campaigns/visual spend/OpenClaw prod **OFF** |

### Evidencia

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
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_CEO_PARTNER_PAYOUTS=0
```

---

## Próximo paso EXACTO

1. **Commit + push** ADR-055 → deploy staging `ideal-victory` (tip TBA).  
2. **CEO:** abrir/conectar 8 cuentas sociales oficiales — `docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md`.  
3. **Legal:** enviar dossier Pepito + obtener licencia comercial escrita — `docs/ops/DATOS_PEPITO_LICENSE_DOSSIER.md` + `docs/ops/CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md` (bloquea `claimReady`).  
4. **Ops:** tras deploy ADR-055, activar en staging **solo** `NELVYON_SHARED_MEMORY_STAGING=1` + `NELVYON_MCP_STAGING_SYNTHETIC=1` (synthetic harness; productivo SM/MCP permanece **0**).  
5. **Ops:** ejecutar E2E staging `automations-ops-pack` + `reputation-ops-pack` → evidencia antes de salir de beta.  
6. **No** READY · **no** prod OpenClaw/OpenAI/MCP productivo/SM productiva/payouts/campañas/visual spend.

SSOT: `OS_ELITE_STATE_MATRIX.md` · `OS_CATALOG_V1.md` · ADR-055
