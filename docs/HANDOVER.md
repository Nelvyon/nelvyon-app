# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **ADR-061 VERIFIED staging** · tip **`9e931f08`** · deploy **`794662d7` SUCCESS** · mig **519+520** · restart smoke **ALL_PASS** · `claimReady: false` · **NOT READY**  

> Última actualización automática: **2026-07-25 14:43 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | `9e931f08` — `feat(erp): Postgres SSOT for Blocks 26-29 via erp_domain_snapshots` |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** · sin `claimReady` · sin prod IA · sin iOS · sin multi-región |
| **Staging live** | https://ideal-victory-staging.up.railway.app · tip **`9e931f08`** · deploy **`794662d7` SUCCESS** · `AUTONOMOUS_ALLOW_OPENAI=0` · `_migrations` **519+520** |
| **Catalog** | OsCatalogV1 **v1.7.0** · ERP 26–29+35 **IMPLEMENTED_VERIFIED** · **ADR-061** SSOT = Postgres `erp_domain_snapshots` · restart **ALL_PASS** |
| **Prod** | flags **OFF/ABSENT** · OpenAI=0 · canary prod **BLOCKED_CEO** · **no** ERP migrate/activate sin CTO |
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
| `purchases_suppliers_core` (Block 26) | **IMPLEMENTED_VERIFIED** | Postgres SSOT · staging restart **ALL_PASS** · payments **BLOCKED_SCOPE** |
| `inventory_warehouses_core` (Block 27) | **IMPLEMENTED_VERIFIED** | Postgres SSOT · no cost/GL |
| `manufacturing_ops_core` (Block 28) | **IMPLEMENTED_VERIFIED** | Postgres SSOT · IoT **BLOCKED_EXTERNAL** |
| `projects_field_service_core` (Block 29) | **IMPLEMENTED_VERIFIED** | Postgres SSOT · e-signature **BLOCKED_EXTERNAL** |
| `sector_capability_taxonomy` (Block 35) | **IMPLEMENTED_VERIFIED** (inventory) | industry **PREPARED_OFF** · health **BLOCKED_LEGAL** · **no Odoo** |

**No READY.** No inventar verde en OAuth real, spend, publish real, Twilio, App Store/Play, iOS PWA, Railway pgvector, prod IA, multi-región, Odoo/finance/accounting. **ADR-061 staging VERIFIED:** create → redeploy → read same supplier; snapshot row + RLS on.

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

## Último trabajo (staging VERIFIED)

- **ADR-061 closed on staging:** tip **`9e931f08`** · deploys **`86c93c8c`** (mig) + **`794662d7`** (recycle proof) · `_migrations` **519+520** · smoke `erp.persistence_restart_latest.md` **ALL_PASS** · DB snapshot purchases version 3 · vitest ERP suites **49 PASS / 2 skip** · `claimReady: false`.

## Próximo paso EXACTO

1. **CTO/Daniel:** decidir si/when recomendar migrate ERP en **prod** (hoy: **no** — staging only; needs explicit CTO go-ahead).
2. **Opcional ops:** dual-write a tablas relacionales 519 (companions) — snapshot store ya es SSOT durable.
3. **Opcional:** smoke HTTP multi-tenant A/B en staging con segundo workspace (unit A/B + RLS ya verdes).
4. **CEO:** firmar SÍ/NO en `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` (**PENDING_CEO**; prod OFF).
5. **CEO/ops:** Safari/iPhone — `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md`.
6. **Legal:** licencia Pepito escrita antes de `claimReadyLegal` / `claimReady`.

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
| 12 | CTO go-ahead explícito antes de migrate ERP en **prod** | este HANDOVER · `CTO_FINAL_VERIFY.md` |
