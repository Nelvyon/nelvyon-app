# Checklist Daniel — Apps OAuth reales (Google / Meta / LinkedIn / Twilio)

> Actualizado: **2026-07-30** · tip ver HANDOVER · Fase 2 aliases + host `app.nelvyon.com` · `claimReady: false`  
> Hoy el framework OAuth multi-tenant (`backend/agency/OAuthMultiTenantFramework.ts`) usa
> **proveedores simulados (mock)** para Google/Meta/LinkedIn/Twilio — genera tokens sintéticos,
> nunca hace una llamada HTTP real. Sirve para probar el ciclo completo (autorizar, rotar,
> revocar, reconectar, borrar) sin depender de cuentas reales.  
> En paralelo, `/api/oauth/{google,meta,linkedin}` usa proveedores **reales** cuando hay secrets.  
> SSOT: `docs/ops/PHASE2_EXTERNAL_INTEGRATIONS.md`.

## Redirect URIs exactas (registrar en cada consola)

**Host canónico de producto:** `https://app.nelvyon.com`  
**Override:** `NEXT_PUBLIC_APP_URL` / `*_REDIRECT_URI`  
**Staging Railway (solo pruebas):** `https://ideal-victory-staging.up.railway.app`

| Flujo | Path exacto | Env override | Default en código hoy |
|-------|-------------|--------------|------------------------|
| Hub SaaS (HubSpot/Slack vía FastAPI) | `/api/saas/oauth/callback` | `NEXT_PUBLIC_APP_URL` | `{appUrl}/api/saas/oauth/callback` |
| Google Ads/OAuth | `/api/oauth/google/callback` | `GOOGLE_REDIRECT_URI` | `{NEXT_PUBLIC_APP_URL\|\|app.nelvyon.com}/api/oauth/google/callback` |
| Meta Ads/OAuth | `/api/oauth/meta/callback` | `META_REDIRECT_URI` | idem `/api/oauth/meta/callback` |
| LinkedIn Ads/OAuth | `/api/oauth/linkedin/callback` | `LINKEDIN_REDIRECT_URI` | idem `/api/oauth/linkedin/callback` |
| TikTok Ads/OAuth | `/api/oauth/tiktok/callback` | `TIKTOK_REDIRECT_URI` | idem `/api/oauth/tiktok/callback` |
| Snapchat Ads/OAuth | `/api/oauth/snapchat/callback` | `SNAPCHAT_REDIRECT_URI` | idem `/api/oauth/snapchat/callback` |

### URIs a pegar en producción (recomendado)

```
https://app.nelvyon.com/api/saas/oauth/callback
https://app.nelvyon.com/api/oauth/google/callback
https://app.nelvyon.com/api/oauth/meta/callback
https://app.nelvyon.com/api/oauth/linkedin/callback
https://app.nelvyon.com/api/oauth/tiktok/callback
https://app.nelvyon.com/api/oauth/snapchat/callback
```

Si usas apex `nelvyon.com` además de `app.`, registra **ambos** hosts o fija las vars `*_REDIRECT_URI` al host único que elijas y alinea `NEXT_PUBLIC_APP_URL`.

### Staging (opcional)

```
https://ideal-victory-staging.up.railway.app/api/saas/oauth/callback
https://ideal-victory-staging.up.railway.app/api/oauth/google/callback
https://ideal-victory-staging.up.railway.app/api/oauth/meta/callback
https://ideal-victory-staging.up.railway.app/api/oauth/linkedin/callback
https://ideal-victory-staging.up.railway.app/api/oauth/tiktok/callback
https://ideal-victory-staging.up.railway.app/api/oauth/snapchat/callback
```

## Qué falta por proveedor

| # | Proveedor | Qué hace falta de ti | Secretos (nombres, no valores) |
|---|-----------|----------------------|--------------------------------|
| 1 | **Google** | Cloud Console + consentimiento OAuth + Client ID/Secret | `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REDIRECT_URI` |
| 2 | **Meta** | App Meta for Developers + App Review si scopes avanzados | `META_APP_ID` · `META_APP_SECRET` · `META_REDIRECT_URI` |
| 3 | **LinkedIn** | LinkedIn Developer Portal + producto autorizado | `LINKEDIN_CLIENT_ID` · `LINKEDIN_CLIENT_SECRET` · `LINKEDIN_REDIRECT_URI` |
| 4 | **Twilio** | Cuenta Twilio (ver también `TELEPHONY_PROVIDER_CEO_CHECKLIST.md`) | credenciales Twilio / Auth Token — **no** activar dialer real sin checklist telefonía |
| 5 | **TikTok / Snapchat** (ads) | Apps en portales respectivos si se activan ads | `TIKTOK_*` / `SNAPCHAT_*` + redirect URI |

Para cada uno hace falta además:
- **Redirect URI** de producción registrada (tabla de arriba).
- **Clave de cifrado real** (`NELVYON_OAUTH_MT_ENCRYPTION_KEY`, 64 caracteres hex) generada y
  guardada como secreto de producción — sin ella, el sistema se niega a arrancar en
  producción (fail-closed, nunca usa una clave débil por defecto).
- Confirmación de qué **scopes mínimos** necesita cada integración (ya definidos en código,
  revisar que sigan siendo los correctos antes de ir a producción).
- **Spend / publish OFF** hasta SÍ CEO (`ADS_OAUTH_SPEND_CEO_CHECKLIST.md`, `SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md`).

## Qué pasa en el código mientras esto no esté

- Los 4 adaptadores multi-tenant (`GoogleMockOAuthProvider`, `MetaMockOAuthProvider`,
  `LinkedInMockOAuthProvider`, `TwilioMockOAuthProvider`) son simulados: generan tokens con
  prefijo `mock-...` y nunca contactan un servidor de autorización real.
- El resto del ciclo de vida (PKCE, estado CSRF de un solo uso, cifrado AES-256-GCM,
  aislamiento por tenant, rotación, revocación, reconexión, borrado, auditoría) sí es real y
  ya está probado — solo el intercambio de código por token está simulado.
- Sin `NELVYON_OAUTH_MT_ENCRYPTION_KEY` configurada, fuera de entorno de test el sistema
  lanza un error en vez de arrancar con una clave insegura por defecto.

## Próximo paso EXACTO (humano)

1. Decide qué proveedor(es) reales necesitas primero.
2. Crea las apps/proyectos en cada consola.
3. Registra las redirect URIs exactas de la sección superior.
4. Genera y guarda `NELVYON_OAUTH_MT_ENCRYPTION_KEY` como secreto de producción (64 hex).
5. Carga Client ID/Secret en Railway **sin pegarlos en git/chat**.
6. Avisa al equipo técnico — sustituirán el adaptador mock por uno real solo para el/los
   proveedores confirmados, uno a la vez, con spend/publish OFF.
