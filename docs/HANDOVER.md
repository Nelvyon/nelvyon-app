# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-01** — Foco activo: **web pública NELVYON certificada + live en prod** · SaaS claimReady true · canary IA **KILL**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `aa9ec67a` SUCCESS (`@nelvyon/web` production) · web pública **26/26** HTTP 200 |
| **Staging** | `4ed47ae0` SUCCESS · password cert 31/31 · JWT 23/23 · LH a11y 100 |
| **Calidad web pública** | tsc **PASS** · eslint public-web **PASS** · build:prod **PASS** · LH a11y/BP **100** · crawl local+prod **PASS** |
| **claimReady** | **true** |
| **claimReadyLegal** | **false** (mass-send campañas bloqueado — legal) |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Residual opcional: bajar JS del shell compartido en rutas marketing para LH performance ≥95 (hoy 87–89) — ver `docs/evidence/public-web-cert-final.json`.
2. Mantener canary IA **KILL** y `claimReadyLegal: false` hasta autorización explícita.
3. Post-commit: confirmar tip GitHub = tip Railway si el deploy fue por `railway up` (working tree) y no por push automático.

### Web pública (estado)

- **Certificada + desplegada** en `https://app.nelvyon.com` (deploy `aa9ec67a`).
- Evidencia: `docs/evidence/public-web-cert-final.json` · `docs/evidence/public-web-prod-postdeploy_latest.json`.
- Design system: `apps/web/src/features/public-web/` (Sofax = base técnica de referencia; Nivia = inspiración; **sin copiar plantilla**).
- Chrome: `PublicShell` vía `MarketingChrome`.
- Rutas canónicas live: `/plataforma`, `/agencia`, `/automatizaciones-ia`, `/soluciones`, `/sectores`, `/enterprise`, `/integraciones`, `/precios`, `/casos-de-exito`, `/recursos`, `/faq`, `/aviso-legal`, `/seguridad`, `/legal/subprocessors`, etc.
- Assets WebP en `apps/web/public/brand/public/`.

### Seguridad producción (mantener)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```

Upstash Redis obligatorio en prod (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) — fail-closed en auth crítico sin él.
