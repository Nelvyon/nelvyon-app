# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **fix 500 next start · gates verdes · sin deploy**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `6159c6b8` · commit `ca081d0e` (prod intacta — **no deploy** de este WIP) |
| **WIP local** | `1d217320` — fix 500 `next start` (`_FUMADOCS_MDX` + assert artifacts). **Sin deploy.** |
| **Web pública** | Next + AIOR · `next start` sano · crawl **34/34** |
| **claimReady** | **true** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. CEO revisión visual local (`http://127.0.0.1:3010` con build limpio + `next start`).
2. **No deploy** hasta OK visual CEO.
3. Antes de cualquier `next start` local: `node scripts/assert-next-prod-artifacts.mjs` (falla si `.next/static` vacío o manifest `development`).

## Causa raíz del 500 (resuelta)

`next start` CLI **no** aplicaba el guard `_FUMADOCS_MDX=1` que ya tenía `apps/web/server.js`. fumadocs-mdx regeneraba en boot y, con `.next` contaminado (manifest `static/development` + `static/` vacío), webpack-runtime hacía `a[moduleId].call` sobre `undefined` → HTTP 500 en HTML. APIs como `/api/contact` seguían vivas.

**Fix:** mismo guard en `apps/web/next.config.ts` antes de `createMDX()` + script `assert-next-prod-artifacts.mjs`.

## Gates post-fix (evidencia)

| Gate | Resultado |
|------|-----------|
| assert-next-prod-artifacts | **PASS** (1108 static files) |
| `/` + `/login` | **200** |
| cert-crawl | **34/34 PASS** + contactApi **400** |
| content-sweep | **PASS** fail=0 |
| Playwright marketing | **7/7 PASS** |
| Lighthouse (Edge, 4 rutas) | **PASS** a11y 99–100 · seo 92 · bp 92 · perf 55–60 (local; residual shell JS) |

## Port AIOR

Cerrado. Sin páginas pendientes de port.
