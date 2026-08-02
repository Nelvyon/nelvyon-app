# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **pack AIOR→NELVYON candidato técnico · pass7 contenido · sin deploy**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `6159c6b8` · commit `ca081d0e` (prod intacta) |
| **WIP local** | `/www/` 36 páginas · pass7 · precios reales · counters honestos · hero contraste OK · noindex |
| **Evidencia** | `docs/evidence/public-web-aior-nelvyon/FINAL_REPORT.md` + screenshots + certify/audit |
| **Mapa** | `docs/ops/AIOR_NELVYON_FULL_TEMPLATE_MAP.md` (**temporal**) |
| **claimReady** | **false** (falta OK visual CEO + URLs definitivas) |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **Revisión visual final CEO** en `http://127.0.0.1:3010/www/mapa-plantillas.html` + Homes + internas.
2. Confirmar fidelidad layout AIOR (sin rediseño) y contraste/media.
3. Completar datos humanos legales si aplica (`[PENDIENTE_DATOS_REGISTRALES]` en rutas React).
4. **Solo entonces** decidir URLs definitivas (quitar `noindex` / canonical `/www/*`).
5. **No deploy** hasta OK explícito.

## Gates

```bash
node scripts/brand-aior-nelvyon.mjs
node scripts/content-aior-nelvyon-only.mjs
node scripts/fidelity-aior-media-pass.mjs
node scripts/report-aior-media-fidelity.mjs
node scripts/audit-aior-www-pages.mjs
node scripts/certify-aior-nelvyon-content.mjs
# → plantillas ok · EN 0 · media selectiva · Playwright marketing 7/7
```
