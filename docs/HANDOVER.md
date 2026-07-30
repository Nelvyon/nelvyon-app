# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — **Fase 3** release APK **1.0.0** · Fase 2 prep · prod tip live **`3f10c272`** · canary **KILL ON** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` (`git_sha=3f10c2729502`) |
| **Android release** | v**1.0.0** · evidence `mobile.android_release_latest.md` · Play **BLOCKED_EXTERNAL** |
| **Ops SSOT integraciones** | `docs/ops/PHASE2_EXTERNAL_INTEGRATIONS.md` |
| **Mig prod** | **521+522 APPLIED** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Fase 2 (Cursor) — cerrado in-repo

| Cambio | Detalle |
|--------|---------|
| OAuth defaults | Host canónico `app.nelvyon.com` vía `oauthEnv.defaultOAuthRedirectUri` |
| Meta / TikTok aliases | `META_APP_*`↔`META_CLIENT_*` · `TIKTOK_APP_*`↔`TIKTOK_CLIENT_*` |
| Hub catalog | Ads/Twilio/WA **beta** · envKeys con aliases · WA keys completas |
| Validadores | `missing*OAuthEnvKeys` · `missingWhatsAppCloudEnvKeys` · preflight + `validate-phase2-integrations.mjs` |
| Docs | PHASE2 SSOT · WhatsApp checklist · Stripe KI-R028 · dual-path social/telephony/ads honesty |

## Próximo paso EXACTO

1. Daniel: instalar APK release en dispositivo (`mobile.android_release_latest.md`) → login SaaS.
2. CEO: OAuth secrets / SES / Twilio/WA según Fase 2 checklists.
3. CEO: Play Store solo con cuenta de pago + upload key (no usar el keystore local de sideload).
4. Legal/comercial: Pepito + clientes — sin flip `claimReady`.

### Rollback IA / spend

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```
