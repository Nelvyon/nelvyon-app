# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **web pública AIOR completa en Next · gates finales · sin deploy**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `6159c6b8` · commit `ca081d0e` (prod intacta) |
| **WIP local** | commits `7ce213b2` + `1ee07ea8` + cleanup residuales (pendiente commit) |
| **Web pública** | Next + AIOR slim · sin `/www/` · sin piel Zubaz/DeepPage en rutas |
| **claimReady** | **true** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Ejecutar gates locales uno a uno (tsc → eslint → vitest marketing → crawl → sweep → build → Playwright marketing config sin webServer). Timeout máx. 10 min/gate.
2. CEO revisión visual final en local.
3. **No deploy** hasta OK CEO.

### Port AIOR — estado

- Rutas `(marketing)` + legales + blog body: **AIOR**
- Residual eliminado: DeepPage, Aceternity, ui/Zubaz CSS, mocks huérfanos
- Assets slim: `public/brand/public/aior/`
