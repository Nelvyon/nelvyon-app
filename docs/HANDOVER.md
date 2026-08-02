# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **cierre excelencia pack AIOR→NELVYON · sin deploy**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `6159c6b8` · commit `ca081d0e` (prod intacta) |
| **WIP local** | `/www/` excelencia pass8 · sin datos ficticios · precios alineados · noindex |
| **Evidencia** | `docs/evidence/public-web-aior-nelvyon/EXCELLENCE_CLOSURE_REPORT.md` |
| **Mapa** | `docs/ops/AIOR_NELVYON_FULL_TEMPLATE_MAP.md` (**temporal**) |
| **claimReady** | **false** (OK visual CEO + URLs definitivas) |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **Revisión visual CEO** (`/www/mapa-plantillas.html` + homes) — único gate humano de publicación.
2. Decidir URLs definitivas (quitar `noindex` / canonical `/www/*`).
3. Opcional: sustituir fotos stock de equipo por fotos reales.
4. **No deploy** hasta OK explícito.

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
