# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **auditoría absoluta final pack `/www` · certificado PASS · sin deploy**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `6159c6b8` · commit `ca081d0e` (prod intacta) |
| **WIP local** | `/www/` pass9–11 + mapa contacto ES + CSP Google Maps · noindex |
| **Evidencia** | `docs/evidence/public-web-aior-nelvyon/FINAL_QUALITY_CERTIFICATE.md` |
| **Mapa** | `docs/ops/AIOR_NELVYON_FULL_TEMPLATE_MAP.md` (**temporal**) |
| **claimReady** | **false** (OK visual CEO + URLs definitivas) |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **Revisión visual CEO** (`/www/mapa-plantillas.html` + homes) — único gate humano de publicación.
2. Decidir URLs definitivas (quitar `noindex` / canonical `/www/*`).
3. Opcional: sustituir fotos stock de equipo por fotos reales.
4. **No deploy** hasta OK explícito. Publicar solo con build que incluya CSP Google Maps (`headers.ts`).

## Gates

```bash
node scripts/content-aior-nelvyon-only.mjs
node scripts/certify-aior-nelvyon-content.mjs
node scripts/certify-aior-www-final-quality.mjs --base=http://127.0.0.1:3013
# Playwright: e2e/www-live-qa.spec.ts → 10/10 (base :3013)
# → grade PASS · realErrorCount 0 · CSP frame-src Google OK
```
