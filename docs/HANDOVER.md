# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **Cierre 8 puntos amarillos (honestidad)** · chatbot mesh soft-continue (ADR-058) pending staging redeploy · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (**NOT READY** · no claimReady · no prod IA) |
| **Staging live** | https://ideal-victory-staging.up.railway.app · deploy **b783e3fd** SUCCESS · live SHA **`b2d1d2d9`** (lineage incluye **`54d9149a`**) · health/live/ready **200** |
| **Tests locales** | `tsc --noEmit` **0** · `vitest backend/agency + meshQaFixes` **314 PASS** · `pwa-certify` **PASS** · HA/DR smoke ALL_PASS · pgvector Docker live **PASS_WITH_KNOWN_GAP** |
| **Catalog** | OsCatalogV1 **v1.4.0** · `influencers_pr` aún **PREPARED_OFF** hasta E2E ALL_PASS post-redeploy ADR-058 |
| **Prod** | flags productivos **OFF/ABSENT** · `AUTONOMOUS_ALLOW_OPENAI=0` · canary prod **BLOCKED_CEO** |
| **Legal** | `claimReady` **false** · `claimReadyLegal` **false** |

### Tabla — 8 puntos amarillos (evidencia real)

| # | Punto | Estado | Evidencia / nota |
|---|-------|--------|------------------|
| 1 | Deploy staging | **VERDE VERIFICADO** | `staging.deploy_b783e3fd.md` · SUCCESS · live `b2d1d2d9` · health 200 |
| 2 | Influencers/PR | **PREPARED_OFF** (fix local ADR-058) | E2E falló `QA 30 — escalado` (LLM blockers) · fix `normalizeChatbotPlan` + soft-continue **local** · **requiere redeploy + E2E ALL_PASS** antes de IMPLEMENTED_VERIFIED |
| 3 | App móvil | **BLOCKED_EXTERNAL** | `mobile.android_blocked.md` · sin `apps/mobile/android/` · sin adb/SDK · iOS/App Store **BLOCKED_EXTERNAL** |
| 4 | PWA | **VERDE VERIFICADO** (Chrome/Windows) · iOS **BLOCKED_EXTERNAL** | `pwa.cert_latest.md` · checklist 3 pasos `PWA_IOS_SAFARI_CEO_CHECKLIST.md` |
| 5 | Idiomas fr/de/it/pt | **VERDE VERIFICADO** (UI crítica) | `LocalizationCore` FULL_VERIFIED + key-parity tests · email/PDF siguen ES-only (fuera de claim) |
| 6 | Multi-región / escala | **VERDE VERIFICADO** single-region · multi-región **BLOCKED_EXTERNAL/COST** | `HaDrReadiness` + `ha-dr-readiness_*.md` · `HA_DR_SCALE_RUNBOOK.md` |
| 7 | RAG vectorial | **VERDE VERIFICADO** Docker local · Railway staging **PREPARED_OFF** | `pgvector-rag.live_latest.md` · sin Postgres+pgvector en Railway |
| 8 | IA propia productiva | **PREPARED_OFF** + **BLOCKED_CEO** | staging canary prep OK · `CEO_IA_PROD_CANARY_REQUEST.md` PENDING · prod OFF |

### ADR-057 — Blocks 11–25 (resumen)

| Block | Capacidad | Estado core | Bloqueo externo / legal |
|-------|-----------|-------------|-------------------------|
| **11** | telephony_core | IMPLEMENTED_VERIFIED (simulator) | llamadas reales BLOCKED_EXTERNAL |
| **12** | influencers_pr | PREPARED_OFF | E2E staging pending ADR-058 deploy |
| **13** | ads_attribution_core | IMPLEMENTED_VERIFIED | spend/OAuth BLOCKED_EXTERNAL |
| **14** | community_publish_core | IMPLEMENTED_VERIFIED (simulator) | publish real BLOCKED_EXTERNAL |
| **15** | mass-send technical | IMPLEMENTED_VERIFIED | claimReadyLegal false · BLOCKED_LEGAL |
| **16** | oauth_multitenant | IMPLEMENTED_VERIFIED (mock) | apps reales BLOCKED_EXTERNAL |
| **17** | integrations_marketplace | IMPLEMENTED_VERIFIED | publish externo rechazado |
| **18** | mobile Capacitor | shell VERIFIED · android local **BLOCKED_EXTERNAL** | stores BLOCKED_EXTERNAL |
| **19** | PWA | Chrome/Windows VERIFIED | iOS Safari BLOCKED_EXTERNAL |
| **20** | localization | es/en/fr/de/it/pt FULL_VERIFIED (UI crítica) | email/PDF ES-only gap |
| **21** | HA/DR | single-region VERIFIED | multi-región BLOCKED_EXTERNAL/COST |
| **22** | observability | VERIFIED local | vendors de pago PREPARED_OFF |
| **23** | legacy consolidation | VERIFIED audit | zero unsafe deletes |
| **24** | private_vector_rag | Docker VERIFIED | Railway staging PREPARED_OFF |
| **25** | private_ai_canary_prep | PREPARED_OFF | BLOCKED_CEO |

### Rollback staging

```
NELVYON_PACK_INDEPENDENT_AUDITOR=0
NELVYON_INFLUENCERS_PR_PACK=0
NELVYON_AUTOMATIONS_OPS_PACK=0
NELVYON_REPUTATION_OPS_PACK=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_SHARED_MEMORY_ENABLED=0
NELVYON_MCP_PRODUCTIVE_ENABLED=0
```

---

## Próximo paso EXACTO

1. **Ops (inmediato):** commit+push ADR-058 (chatbot normalize) → Railway staging redeploy **una vez** → `node scripts/staging-smoke-influencers-pr-e2e.mjs` → solo si **ALL_PASS** promover `influencers_pr` a IMPLEMENTED_VERIFIED + evidencia md.
2. **CEO:** IA prod canary — `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` (**PENDING_CEO**; prod permanece OFF).
3. **CEO/ops externo:** iPhone Safari 3 pasos — `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md`.
4. **CEO:** mobile stores — `docs/ops/MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` (Android local + iOS BLOCKED).
5. **CEO presupuesto:** multi-región / Postgres+pgvector en Railway staging (hoy COST/BLOCKED).
6. **Legal:** `claimReadyLegal` permanece false hasta licencia escrita Pepito.
7. **P2 no bloqueante:** minScore RAG corpus pequeño — `docs/KNOWN_ISSUES.md`.
