# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **AIOR visual + contenido NELVYON LIVE en prod**

| Campo | Valor |
|-------|-------|
| **Tip / deploy** | `92b2b462` · Railway `df882d11` **SUCCESS** |
| **Health** | `git_sha=92b2b4627420` (nelvyon.com + app.nelvyon.com) |
| **Regla** | AIOR visual intacto · solo logo/textos/precios/SEO · **0 saas-shots** |
| **CSS** | `--theme-color: #7B5DFF` (AIOR) · sin override NELVYON |
| **claimReady** | **false** hasta OK visual CEO + URLs definitivas |
| **Canary** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. OK visual CEO en https://nelvyon.com (hard refresh si veía pack SaaS anterior).
2. Decidir URLs definitivas (quitar `noindex` / canonical temporal `/www/*` cuando proceda).
3. No reactivar scripts `fidelity-*` / `fix-aior-selective-media` / inject saas-shots.

## Validación prod (hecha)

- 36/36 HTML sin `saas-shots` ni `assets/img/nelvyon`
- `/www/assets/img/nelvyon/dashboard.webp` → **404**
- Assets clave byte-match AIOR (`hero_bg_1`, `about_1_1`, `style.css`)
- Form contacto `action=/api/contact` · `main.js` 200
