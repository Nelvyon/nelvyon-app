# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-01** — Foco activo: **biblioteca Envato integrada (parcial P0) + DeviceMockup · NO deploy** · claimReady true · canary **KILL**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `aa9ec67a` (anterior; **NO redeploy** hasta aprobación visual) |
| **Web pública WIP** | Zubaz + saas-shots + **library/** (F-01/F-02 WebP+AVIF, I-01…I-05 SVG, DeviceMockup) · tsc **PASS** |
| **claimReady** | **true** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **Deploy producción web pública en curso / validación post-deploy** en `https://app.nelvyon.com` (gates locales PASS; commit+push+Railway).
2. Tras tip live confirmado: completar descarga P0 Envato restante (F-03…F-24, V-01…V-03, M extras, I-06) → organize + reintegrar.
3. Aceternity OBLIGATORIOS (`docs/ops/ACETERNITY_NELVYON_AUDIT.md`) si el CEO lo prioriza tras prod estable.

### Capturas SaaS (hecho)

- Tenant demo: **Nelvyon Demo · Aether Labs** (fixtures, sin PII real).
- Regenerar: servidor en `:3010` + `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 pnpm -C apps/web exec playwright test --config playwright.marketing-shots.config.ts` + `node apps/web/scripts/optimize-saas-shots.mjs`
- Raw PNG ignorables en git; WebP en `apps/web/public/brand/public/saas-shots/`

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
