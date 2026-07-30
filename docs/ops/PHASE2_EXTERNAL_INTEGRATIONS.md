# Phase 2 — External integrations SSOT

> **2026-07-30** · tip ver HANDOVER · `claimReady: false` · canary **KILL ON** · spend/publish/calls **OFF**  
> Cursor closes in-repo prep. Humans load secrets and approve spend/publish/calls.

## Architecture (honest)

| Layer | Role |
|-------|------|
| `/api/oauth/{google,meta,linkedin,tiktok,snapchat}` | Real OAuth code exchange when Client ID/Secret set |
| `/api/saas/oauth/*` | HubSpot/Slack-style SaaS OAuth (FastAPI callback hub) |
| Agency `*MockOAuthProvider` / Ads connectors / TelephonyCore | Mock or **BLOCKED_EXTERNAL** until CEO + real adapters |
| `SaasSocialService` / `SaasDialerService` / WA Cloud | Can call real APIs if env + tokens present — **do not enable without checklist** |

## Canonical redirect / webhook hosts

**Product host:** `https://app.nelvyon.com` (default when `NEXT_PUBLIC_APP_URL` unset).  
Legacy apex `https://nelvyon.com` may still be registered historically (SES SNS). Prefer **one** host aligned with `NEXT_PUBLIC_APP_URL`.

| Surface | Path |
|---------|------|
| Google OAuth | `/api/oauth/google/callback` |
| Meta OAuth | `/api/oauth/meta/callback` |
| LinkedIn OAuth | `/api/oauth/linkedin/callback` |
| TikTok / Snapchat | `/api/oauth/tiktok/callback` · `/api/oauth/snapchat/callback` |
| SaaS hub OAuth | `/api/saas/oauth/callback` |
| Stripe | `/api/webhooks/stripe` (+ connect/store) |
| SES/SNS | `/api/webhooks/ses` |
| WhatsApp | `/api/webhooks/whatsapp` |

Validate defaults (no secrets): `node scripts/validate-phase2-integrations.mjs`

## Env aliases (accepted)

| Integration | Canonical | Also accepted |
|-------------|-----------|---------------|
| Meta Ads OAuth | `META_APP_ID` / `META_APP_SECRET` | `META_CLIENT_ID` / `META_CLIENT_SECRET` |
| TikTok Ads OAuth | `TIKTOK_APP_ID` / `TIKTOK_APP_SECRET` | `TIKTOK_CLIENT_ID` / `TIKTOK_CLIENT_SECRET` / `TIKTOK_CLIENT_KEY` |
| SES | `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` | `AWS_SES_ACCESS_KEY` / `AWS_SES_SECRET_KEY` |
| Stripe secret | `STRIPE_SECRET_KEY` | `STRIPE_API_KEY` |

Helpers: `backend/oauth/oauthEnv.ts` · `missing*EnvKeys` via `backend/saas/saasEnv.ts`.

## Where to paste secrets (Railway → `@nelvyon/web` production)

Never commit values. Exact var names:

1. OAuth: `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REDIRECT_URI` (optional if default OK)  
   same pattern for Meta (`META_APP_*` or `META_CLIENT_*`) · LinkedIn · TikTok · Snapchat  
2. Stripe: see `docs/OPS_STRIPE_PROD.md`  
3. SES: see `docs/OPS_SES_PROD.md`  
4. Twilio: `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_FROM_NUMBER`  
5. WhatsApp Cloud: `META_WA_PHONE_NUMBER_ID` · `META_WA_ACCESS_TOKEN` · `META_WA_VERIFY_TOKEN` · `META_WA_APP_SECRET`  
6. Optional MT encrypt: `NELVYON_OAUTH_MT_ENCRYPTION_KEY` (64 hex) before real multi-tenant OAuth adapters

## Flags that must stay OFF until CEO SÍ

```
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```

## CEO checklists (exact human steps)

| Area | Doc |
|------|-----|
| Google/Meta/LinkedIn apps | `OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` |
| Ads spend | `ADS_OAUTH_SPEND_CEO_CHECKLIST.md` |
| Social publish | `SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md` |
| Official Nelvyon social | `NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` |
| Twilio / dialer | `TELEPHONY_PROVIDER_CEO_CHECKLIST.md` |
| WhatsApp | `WHATSAPP_CEO_CHECKLIST.md` |
| Stripe | `OPS_STRIPE_PROD.md` |
| SES/SNS | `OPS_SES_PROD.md` |
| Master list | `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md` |

## GBP (Google Business)

Reputation runtime uses `GOOGLE_PLACES_API_KEY` · `GBP_PLACE_ID` · reply tokens `GBP_ACCESS_TOKEN` · `GBP_ACCOUNT_ID` · `GBP_LOCATION_ID`.  
Official social prep may list `GBP_CLIENT_*` / refresh — treat as **token acquisition** path; wire tokens into the runtime names above (do not invent a second OAuth route).
