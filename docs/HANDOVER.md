# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **Cierre interno total** · tip **`bd165985`** · deploy **`1de7f724` SUCCESS** · catalog **v1.6.0** · Android APK VERIFIED · `claimReady: false` · **NOT READY**  
> Última actualización automática: **2026-07-25 12:28 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | `bd165985` — `feat(platform): internal closure — catalog v1.6, i18n, Android APK, obs drill` |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** · sin `claimReady` · sin prod IA · sin iOS · sin multi-región · sin APK |
| **Staging live** | https://ideal-victory-staging.up.railway.app · tip **`bd165985`** · deploy **`1de7f724` SUCCESS** · `AUTONOMOUS_ALLOW_OPENAI=0` |
| **Local tip** | **`bd165985`** — catalog v1.6.0 + i18n + Android APK + obs drill |
| **Catalog** | OsCatalogV1 **v1.6.0** · ads/community cores **IMPLEMENTED_VERIFIED** (core/sim; OAuth/spend/publish **BLOCKED_EXTERNAL**) |
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

**No READY.** No inventar verde en OAuth real, spend, publish real, Twilio, App Store/Play, iOS PWA, Railway pgvector, prod IA, ni multi-región.

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

## Próximo paso EXACTO

1. **CEO:** firmar SÍ/NO en `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` (**PENDING_CEO**; prod OFF).
2. **CEO/ops:** Safari/iPhone — `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md`.
3. **Legal:** licencia Pepito escrita antes de `claimReadyLegal` / `claimReady`.
4. **Mobile:** AVD/USB → `adb install` APK → smoke auth/CRM (build ya VERIFIED).
5. **Externos:** ads OAuth/spend · social publish · Twilio · OAuth apps (checklists CEO).
6. **P2 i18n:** SES catalog restante + `backend/billing/*EmailTemplates.ts` (email/PDF PARTIAL).
7. **P2 RAG:** minScore corpus pequeño · Railway pgvector PREPARED_OFF.
8. **Multi-región:** no activar sin presupuesto CEO.

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
| 12 | Commit + push tip con catalog v1.6.0 / i18n / obs / mobile cuando se decida | working tree actual |

SSOT operativo: este HANDOVER · `CTO_FINAL_VERIFY.md` · `OS_ELITE_STATE_MATRIX.md` · `OS_CATALOG_V1.md` v1.6.0.
