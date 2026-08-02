# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-03** — Foco: **raíz `/` sirve AIOR 200 (no 307 RSC)**

| Campo | Valor |
|-------|-------|
| **Causa raíz** | `/` era `redirect()` Next → **307 + cuerpo RSC** (layout marketing + preload saas-shots). `/www/index.html` ya era AIOR correcto. |
| **Fix** | middleware + `beforeFiles` rewrite `/`→`/www/index.html` · `<base href="/www/">` · SW v4 sin precache `/` · sin SW en root layout |
| **claimReady** | **false** hasta OK visual CEO + URLs definitivas |
| **Canary** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Tras deploy SUCCESS del fix raíz: validar `curl -sI https://nelvyon.com/` → **200** (no 307) + HTML AIOR (`preloader`, `Transforma tu negocio`, 0 saas-shots).
2. OK visual CEO en incógnito en https://nelvyon.com y https://app.nelvyon.com.
3. Decidir quitar `noindex` cuando proceda.
