# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **Cierre 8 puntos amarillos** · influencers E2E **ALL_PASS** · catalog **v1.5.0** · tip **`e81b5034`** · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (**NOT READY** · sin claimReady · sin prod IA · sin iOS · sin multi-región activa) |
| **Staging live** | https://ideal-victory-staging.up.railway.app · tip **`e81b5034`** · deploy **`85be1985` SUCCESS** · health/live/ready **200** |
| **Tests** | `tsc` **0** · agency+meshQaFixes **314+ PASS** · influencers E2E **ALL_PASS** · `pwa-certify` **PASS** |
| **Catalog** | OsCatalogV1 **v1.5.0** · `influencers_pr` **IMPLEMENTED_VERIFIED** (staging) |
| **Prod** | flags **OFF/ABSENT** · OpenAI=0 · canary prod **BLOCKED_CEO** |
| **Legal** | `claimReady` **false** · `claimReadyLegal` **false** |

### Tabla final — 8 puntos amarillos

| # | Punto | Estado | SHA / deploy | Evidencia |
|---|-------|--------|--------------|-----------|
| 1 | Deploy staging | **VERDE VERIFICADO** | tip `e81b5034` · deploy `85be1985` (prev `b783e3fd` SUCCESS) | `staging.deploy_b783e3fd.md` + live sha match |
| 2 | Influencers/PR | **VERDE VERIFICADO** | `e81b5034` | `influencers_pr_e2e_latest.md` · ALL_PASS · 7 entregables · auditor ON · outreach=false |
| 3 | App móvil | **BLOCKED_EXTERNAL** | — | `mobile.android_blocked.md` · iOS/App Store checklist |
| 4 | PWA | **VERDE VERIFICADO** (Chrome) · iOS **BLOCKED_EXTERNAL** | — | `pwa.cert_latest.md` · `PWA_IOS_SAFARI_CEO_CHECKLIST.md` |
| 5 | Idiomas fr/de/it/pt | **VERDE VERIFICADO** (UI crítica) | — | LocalizationCore FULL_VERIFIED · email/PDF ES-only fuera de claim |
| 6 | Multi-región / escala | **VERDE VERIFICADO** single-region · multi-región **BLOCKED_EXTERNAL/COST** | — | HaDrReadiness + runbook |
| 7 | RAG vectorial | **VERDE VERIFICADO** Docker · Railway **PREPARED_OFF** | — | `pgvector-rag.live_latest.md` |
| 8 | IA propia productiva | **PREPARED_OFF** + **BLOCKED_CEO** | — | `CEO_IA_PROD_CANARY_REQUEST.md` · prod OFF |

**No READY:** iOS, multi-región geográfica, Railway pgvector, producción IA y legal requieren requisitos externos reales.

### Rollback staging

```
NELVYON_INFLUENCERS_PR_PACK=0
NELVYON_PACK_INDEPENDENT_AUDITOR=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
```

---

## Próximo paso EXACTO

1. **CEO:** decidir IA prod canary — `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` (**PENDING_CEO**; prod permanece OFF hasta autorización escrita + cambio de código).
2. **CEO/ops:** Safari/iPhone 3 pasos — `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md`.
3. **CEO:** mobile stores — `docs/ops/MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md`.
4. **CEO presupuesto:** multi-región y/o Postgres+pgvector en Railway staging (hoy COST/BLOCKED).
5. **Legal:** licencia Pepito escrita antes de `claimReadyLegal`.
6. **P2:** minScore RAG corpus pequeño — `docs/KNOWN_ISSUES.md`.
