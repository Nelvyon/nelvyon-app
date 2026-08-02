# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **web pública AIOR port cerrado · gates parciales · sin deploy**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `6159c6b8` · commit `ca081d0e` (prod intacta) |
| **WIP local** | `7ce213b2` → `3310912e` (+ fetch timeout en scripts crawl/sweep sin commit aún) |
| **Web pública** | Next + AIOR slim · port de páginas **cerrado** · sin `/www/` |
| **claimReady** | **true** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Diagnosticar `next start` local: todas las páginas HTML responden **500** con `TypeError: Cannot read properties of undefined (reading 'call')` en `webpack-runtime.js` (API `/api/contact` sí responde 400). Rebuild limpio no lo arregló.
2. Tras fix runtime: re-ejecutar crawl + content-sweep + Playwright marketing (`playwright.marketing.config.ts` + `PLAYWRIGHT_BASE_URL`) · timeout 10 min/gate.
3. CEO revisión visual local · **no deploy** hasta OK.

## Gates 2026-08-02 (esta sesión)

| Gate | Resultado |
|------|-----------|
| `tsc --noEmit` | **PASS** |
| eslint public-web/marketing/legal | **PASS** |
| vitest `pricing.test.tsx` | **PASS** 8/8 |
| `pnpm -C apps/web build` | **PASS** (×2, incl. rebuild limpio) |
| content-sweep (sin server) | **BLOCKED** — fetch colgado; matado; añadido `AbortSignal.timeout(20s)` |
| cert-crawl `:3010` | **FAIL** — 0/34 (HTTP 500 webpack-runtime); contactApi ok |
| Playwright marketing | **SKIP** — mismo runtime 500 |
| Lighthouse | **SKIP** — sin browser/server sano |

## Port AIOR — inventario

**Terminadas (piel AIOR+NELVYON en código):** `/`, `/agencia`, `/agencia/[slug]`, `/producto`, `/producto/[slug]` (+ `/producto/ia`), `/enterprise`, `/precios`, `/contacto`, `/integraciones`, `/sectores`, `/sectores/[slug]`, `/casos-de-uso`, `/casos-de-uso/[slug]`, `/casos-de-exito`, `/recursos`, `/faq`, `/automatizaciones-ia`, StandardPage (`/nosotros`, `/servicios`, `/saas`, `/soluciones`, `/seguridad`), aliases agencia (`/seo`, `/ads`, …), `/blog`, `/blog/[id]`, `/aviso-legal`, `/partners`, `/alternatives`, `/status`, `/launch`, `/goodbye`, legales (`LegalPage`).

**Pendientes de port de página:** ninguna (cleanup residual hecho).

**Bloqueo ops:** certificación HTTP/runtime `next start` local (no es “página sin portar”).
