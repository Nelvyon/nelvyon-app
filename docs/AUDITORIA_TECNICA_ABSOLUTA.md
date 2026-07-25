# AUDITORÍA TÉCNICA ABSOLUTA — NELVYON

> Fecha: **2026-07-25** (ADR-061 Postgres ERP SSOT) · tip live **`bd165985`** · deploy **`1de7f724` SUCCESS** · local catalog **v1.7.0** **uncommitted** · claimReady false  
> Veredicto: **CONDITIONAL_READY** · **NOT READY**  
> SSOT: `HANDOVER.md` · `OS_CATALOG_V1.md` v**1.7.0** · ADR-061 · ADR-060

### Matriz estricta

| Dimensión | Estado |
|-----------|--------|
| VERDE VERIFICADO | influencers · ads_attribution (core) · community_publish (sim) · telephony (sim) · oauth (mock) · marketplace · ERP 26–29+35 (API wired · Postgres SSOT when DB) · RAG Docker · PWA Chrome · HA single-region · obs local · legacy (0 deletes) · localization UI FULL |
| PREPARADO OFF | Railway pgvector · private_ai_canary · paid observability · social oficial · industry sector pack |
| PARTIAL | email + PDF locale |
| BLOQUEO EXTERNO | Twilio real · ads OAuth/spend · social publish · APK device · App Store/Play · iOS PWA · multi-region **COST** · IoT · e-signature |
| BLOQUEO SCOPE | ERP payments / bank / tax / GL / cost accounting |
| BLOQUEO CEO | IA prod canary · OpenClaw prod · OpenAI · payouts · 8 cuentas oficiales |
| BLOQUEO LEGAL | claimReady · mass-send · Pepito forbidden · regulated health |
| OPS PENDING | ERP staging restart smoke (mig 519+520 not on live tip) |
| COSTES | 0 |
| Prod | flags **OFF** / **ABSENT** · `AUTONOMOUS_ALLOW_OPENAI=0` (staging) |

### Capacidades (2026-07-25)

| Capacidad | Core | Bloqueo |
|-----------|------|---------|
| influencers_pr | **VERIFIED** | outreach forbidden |
| ads_attribution_core | **VERIFIED** (core) | OAuth/spend **BLOCKED_EXTERNAL** |
| community_publish_core | **VERIFIED** (sim) | publish **BLOCKED_EXTERNAL** |
| telephony_core | **VERIFIED** (sim) | Twilio **BLOCKED_EXTERNAL** |
| oauth_multitenant | **VERIFIED** (mock) | real apps **BLOCKED_EXTERNAL** |
| integrations_marketplace | **VERIFIED** | — |
| private_vector_rag | Docker **VERIFIED** | Railway **PREPARED_OFF** · P2 minScore |
| private_ai_canary | **PREPARED_OFF** | **BLOCKED_CEO** |
| purchases_suppliers_core (26) | **IMPLEMENTED_VERIFIED** | API `withPurchasesPersistence` · payments **BLOCKED_SCOPE** · 519 reserved |
| inventory_warehouses_core (27) | **IMPLEMENTED_VERIFIED** | API `withInventoryPersistence` · no cost/GL · 519 reserved |
| manufacturing_ops_core (28) | **IMPLEMENTED_VERIFIED** | API `withManufacturingPersistence` · IoT **BLOCKED_EXTERNAL** |
| projects_field_service_core (29) | **IMPLEMENTED_VERIFIED** | API `withProjectsFsPersistence` · signature **BLOCKED_EXTERNAL** |
| sector_capability_taxonomy (35) | **IMPLEMENTED_VERIFIED** (inventory) | industry PREPARED_OFF · health **BLOCKED_LEGAL** · **no Odoo** |
| localization UI | **FULL** | email/PDF **PARTIAL** |
| PWA | Chrome **VERIFIED** | iOS **BLOCKED** |
| mobile | Android build VERIFIED | device/stores **BLOCKED** |
| HA/DR | single-region **VERIFIED** | multi-region **BLOCKED_EXTERNAL/COST** |
| observability | local **VERIFIED** | paid **PREPARED_OFF** |
| legacy | **VERIFIED** | zero deletes |

### Evidencia

- Staging tip **`bd165985`** · deploy **`1de7f724` SUCCESS** (live **sin** v1.7.0/519–520 aún)
- Catalog **v1.7.0** local uncommitted · API/UI `/saas/erp/*` · **ADR-061:** Postgres `erp_domain_snapshots` SSOT when `DATABASE_URL` · process-memory **not** SSOT · mig **519** reserved + **520** persistence+RLS
- `erp.cores_synthetic_latest.md` **ALL_PASS** · restart smoke **pending** staging deploy
- P0 process-memory SSOT risk **closed in code** (moved to KNOWN_ISSUES historial)
- `claimReady: false` · **NOT READY**
- Sin OAuth real inventado · sin Odoo · sin multi-región activa · Railway pgvector **PREPARED_OFF**

---

## ADR-056 — P0/P1 (histórico · incluido en baseline)

### P0 (corregido)

| Hallazgo | Fix |
|----------|-----|
| Campaign launch posible con `claimReadyLegal=false` | `getCampaignLaunchBlockReason` bloquea launch · test bypass only |

### P1 (corregidos)

| Hallazgo | Fix |
|----------|-----|
| Chat/ai-copy podían gastar OpenAI sin gate explícito | `isOpenAiSpendAllowed` gates chat+ai-copy |
| `mcp.write` inventado | Eliminado — no write ficticio |
| Shared-memory scopes mezclados | Scopes split en rutas |
| `meta-ads-pack` disponible sin OAuth | Demoted to beta **OAuth OFF** |

---

## 1. Qué se revisó

Barrido del monorepo (código, no solo docs) en:

| Área | Alcance |
|------|---------|
| Arquitectura | SaaS / OS / Portal / BFF / FastAPI proxy / Shared Memory / Private AI |
| Agency cores | Blocks 11–25 + ERP 26–29+35 · catalog v1.7.0 · ADR-060/061 |
| APIs & BFF | `/api/saas/*` incl. `/api/saas/erp/*` → `with*Persistence`, honesty fail-closed |
| AuthZ | `requireSaasContext`, `requirePlatformClaims`, CSRF Origin |
| IA | Router · OpenClaw · Private RAG Docker · canary PREP |
| Campañas legal gate | mass-send **BLOCKED_LEGAL** |
| Docs | HANDOVER · CHANGELOG · CTO_FINAL_VERIFY · OS_CATALOG_V1 · DATABASE 519–520 · ADR-061 |

---

## Próximo paso EXACTO

1. Parent commit tip (catalog v1.7.0 + ERP + 519/520 + docs ADR-061) when Daniel asks  
2. Staging redeploy + restart smoke ERP persistence  
3. Acciones solo Daniel — lista en `HANDOVER.md`  
4. **No READY** · `claimReady: false`

SSOT: `HANDOVER.md` · `CTO_FINAL_VERIFY.md`

---

## Histórico (ADR-056/057/059/060/061 y auditorías previas)

Hallazgos P0/P1 ADR-056, Blocks 11–25 ADR-057, cierre ADR-059, ERP ADR-060, y Postgres SSOT ADR-061 permanecen documentados en:

- `docs/DECISIONS.md` (ADR-061 · ADR-060 · ADR-059 · ADR-058 · ADR-057 · ADR-056 · ADR-055 · ADR-054)
- `docs/CHANGELOG.md`
- evidencias en `scripts/docs/evidence/os-saas-e2e/modules/` (incl. `erp.cores_synthetic_latest.md`)

No se elimina historial; esta sección prioriza el **ADR-061 2026-07-25** como SSOT operativo actual.
