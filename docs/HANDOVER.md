# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **ERP Blocks 26–29+35** catalog **v1.7.0** (living docs · ADR-060) · tip **uncommitted** on **`bd165985`** · `claimReady: false` · **NOT READY**  
> Última actualización automática: **2026-07-25 13:24 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | `0e7d637c` — `feat(erp): Blocks 26-29+35 non-financial ERP cores + sector taxonomy` |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** · sin `claimReady` · sin prod IA · sin iOS · sin multi-región · sin dual-write ERP |
| **Staging live** | https://ideal-victory-staging.up.railway.app · tip **`bd165985`** · deploy **`1de7f724` SUCCESS** · `AUTONOMOUS_ALLOW_OPENAI=0` · **sin** catalog v1.7.0 / mig 519 aún |
| **Local tip** | **uncommitted** · OsCatalogV1 **v1.7.0** + ERP wire + mig **519** on top of **`bd165985`** (parent must commit) |
| **Catalog** | OsCatalogV1 **v1.7.0** · ERP 26–29+35 **IMPLEMENTED_VERIFIED** (in-memory process-local, patrón telephony) · payments/accounting/IoT/signature/health **BLOCKED_*** |
| **Prod** | flags **OFF/ABSENT** · OpenAI=0 · canary prod **BLOCKED_CEO** |
| **Legal** | `claimReady` **false** · `claimReadyLegal` **false** · Pepito **forbidden** |
| **Coste** | 0 |

### Tabla completa — capacidades (honestidad)

| Capacidad | Estado | Matiz / bloqueo |
|-----------|--------|-----------------|
| `influencers_pr` | **VERIFIED** | Staging E2E ALL_PASS · outreach send **forbidden** |
| `ads_attribution_core` | **VERIFIED** (core) | Unit evidence · OAuth/spend **BLOCKED_EXTERNAL** · `NELVYON_ADS_SPEND_ENABLED=0` |
| `community_publish_core` | **VERIFIED** (sim) | Simulator only · real publish **BLOCKED_EXTERNAL** |
| `telephony_core` | **VERIFIED** (sim) | Simulator · Twilio real **BLOCKED_EXTERNAL** |
| `oauth_multitenant` | **VERIFIED** (mock) | Mock providers · real OAuth apps **BLOCKED_EXTERNAL** |
| `integrations_marketplace` | **VERIFIED** | Internal ping only · external publish rejected |
| `private_vector_rag` | **VERIFIED** Docker · Railway **PREPARED_OFF** | Live Docker+Ollama · P2 minScore gap · Railway pgvector **PREPARED_OFF** |
| `private_ai_canary` | **PREPARED_OFF** + **BLOCKED_CEO** | Staging PREP drill VERIFIED · prod canary **PENDING_CEO** |
| Localization UI | **FULL** (es/en/fr/de/it/pt catalogs) | — |
| Localization email + PDF | **PARTIAL** | Resend/SES subset localized · resto ES · PDF labels PARTIAL |
| PWA | **VERIFIED** Chrome · iOS **BLOCKED** | `pwa-certify` PASS · Safari/iPhone **BLOCKED_EXTERNAL** |
| Mobile | Android **build VERIFIED** · device smoke **BLOCKED** · iOS **BLOCKED** | APK `app-debug.apk` · `adb devices` empty · stores BLOCKED |
| HA single-region | **VERIFIED** | Runbook + readiness checks |
| Multi-region | **BLOCKED_EXTERNAL/COST** | No geographic HA active |
| Observability | **VERIFIED** (local) | Paid APM **PREPARED_OFF** |
| Legacy audit | **VERIFIED** | Zero unsafe deletes · `frontend/` DO_NOT_TOUCH |
| Mass-send / claimReady | **BLOCKED_LEGAL** | `claimReadyLegal` hard-false · Pepito forbidden |
| `purchases_suppliers_core` (Block 26) | **IMPLEMENTED_VERIFIED** (in-memory) | `/saas/erp/purchases` + `/api/saas/erp/purchases` · payments/accounting **BLOCKED_SCOPE** · mig **519** reserved · no dual-write |
| `inventory_warehouses_core` (Block 27) | **IMPLEMENTED_VERIFIED** (in-memory) | `/saas/erp/inventory` + API · no cost/GL · **519** reserved · no dual-write |
| `manufacturing_ops_core` (Block 28) | **IMPLEMENTED_VERIFIED** (in-memory) | `/saas/erp/manufacturing` + API · IoT **BLOCKED_EXTERNAL** · **519** reserved |
| `projects_field_service_core` (Block 29) | **IMPLEMENTED_VERIFIED** (in-memory) | `/saas/erp/projects` + API · e-signature **BLOCKED_EXTERNAL** · margin NON-GL · **519** reserved |
| `sector_capability_taxonomy` (Block 35) | **IMPLEMENTED_VERIFIED** (inventory) | `/saas/erp/sectors` + API · industry **PREPARED_OFF** · health regulated **BLOCKED_LEGAL** · **no Odoo** |

**No READY.** No inventar verde en OAuth real, spend, publish real, Twilio, App Store/Play, iOS PWA, Railway pgvector, prod IA, multi-región, Odoo/finance/accounting, ni DB SSOT ERP (sigue in-memory hasta dual-write).

### Rollback staging

```
NELVYON_INFLUENCERS_PR_PACK=0
NELVYON_PACK_INDEPENDENT_AUDITOR=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_ADS_SPEND_ENABLED=0
```

---

## Último trabajo (local · uncommitted)

- **Wire Blocks 26–29 + 35** (ADR-060): `backend/agency/index.ts` exports · OsCatalogV1 **v1.7.0** · API `/api/saas/erp/{purchases,inventory,manufacturing,projects-fs,sectors}` · UI `/saas/erp/*` + sidebar · smoke `staging-smoke-erp-cores.mjs` · evidencia `erp.cores_synthetic_latest.md` **ALL_PASS** · mig **519** schema reserved only (runtime SSOT = in-memory cores; **no** dual-write).

## Próximo paso EXACTO

1. **Parent/Daniel:** commit tip local (catalog **v1.7.0** + ERP API/UI + mig **519** + docs ADR-060) when ready — **do not claim deployed** until then.
2. Optional: push + redeploy staging `ideal-victory` → confirm tip SHA + `_migrations` includes **519** (schema only; still no dual-write).
3. **CEO:** firmar SÍ/NO en `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` (**PENDING_CEO**; prod OFF).
4. **CEO/ops:** Safari/iPhone — `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md`.
5. **Legal:** licencia Pepito escrita antes de `claimReadyLegal` / `claimReady`.
6. Dual-write ERP cores → tables **519** only when persistence is explicitly requested (until then: process-local in-memory SSOT).

---

## Acciones solo Daniel (CEO/ops)

| # | Acción | Doc / artefacto |
|---|--------|-----------------|
| 1 | Firmar canary IA prod SÍ/NO | `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` |
| 2 | Checklist PWA iOS Safari / iPhone | `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md` |
| 3 | Licencia Pepito escrita (bloquea claimReady) | `DATOS_PEPITO_LICENSE_DOSSIER.md` |
| 4 | Ads OAuth/spend (si alguna vez se activa) | `ADS_OAUTH_SPEND_CEO_CHECKLIST.md` |
| 5 | Social publish OAuth real | `SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md` |
| 6 | Twilio / telefonía real | `TELEPHONY_PROVIDER_CEO_CHECKLIST.md` |
| 7 | OAuth provider apps reales | `OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` |
| 8 | Android Studio/SDK → APK debug + smoke | `MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` · `mobile.android_scaffold.md` |
| 9 | Cuentas sociales oficiales NELVYON (8) | `NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` |
| 10 | Presupuesto multi-región / HA geo (si aplica) | `HA_DR_SCALE_RUNBOOK.md` |
| 11 | Railway pgvector + mesh Ollama staging (opcional) | `CEO_IA_STAGING_APPROVAL_REQUEST.md` · `PRIVATE_RAG_RUNBOOK.md` |
| 12 | Commit + push tip catalog **v1.7.0** / ERP wire / mig **519** / docs ADR-060 cuando se decida | working tree actual (**uncommitted**) |

SSOT operativo: este HANDOVER · `CTO_FINAL_VERIFY.md` · `OS_ELITE_STATE_MATRIX.md` · `OS_CATALOG_V1.md` v1.7.0 · ADR-060.
