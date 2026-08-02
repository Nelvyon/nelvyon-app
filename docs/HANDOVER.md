# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **web pública AIOR→NELVYON en Next (sin deploy)** · claimReady true · canary **KILL**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `6159c6b8` · commit `ca081d0e` · `@nelvyon/web` **SUCCESS** (prod intacta; WIP local no desplegado) |
| **URL prod** | https://app.nelvyon.com · https://nelvyon.com |
| **Web pública** | Next + piel AIOR slim (`public/brand/public/aior/`) · Home React `/` · sin `/www/` |
| **Mapa** | `docs/ops/AIOR_NELVYON_PAGE_MAP.md` |
| **claimReady** | **true** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Arrancar local limpio: `pnpm -C apps/web dev --port 3012`
2. CEO revisión visual final desktop+móvil en rutas core.
3. Si OK: gates residuales (Playwright marketing config `playwright.marketing.config.ts` · Lighthouse con browser instalado) y **entonces** autorizar deploy.
4. **No deploy** hasta OK visual CEO.

### Gates ya verificados (sesión AIOR)

- `tsc --noEmit` PASS  
- `eslint` PASS (vendor aior/zubaz ignorados)  
- `build` PASS  
- crawl HTTP 34/34 PASS (`scripts/public-web-cert-crawl.mjs`)  
- content sweep PASS (`scripts/public-web-content-sweep.mjs`)  
- vitest marketing pricing 8/8 PASS  
- Playwright: falló por servidor caído/timeouts; config corregida (sin webServer, `domcontentloaded`) — re-ejecutar con server vivo  
- Lighthouse: bloqueado (chrome-launcher no detecta Edge en este entorno)

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
