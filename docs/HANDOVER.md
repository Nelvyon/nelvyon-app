# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **pack AIOR→NELVYON LIVE en producción**

| Campo | Valor |
|-------|-------|
| **Tip prod live** | deploy `61cb5010` **SUCCESS** · commit `4e78f600` · health `git_sha=4e78f6007f84` |
| **WIP local** | `/www/` pack publicado · redirects 307 → `/www/*.html` · noindex temporal |
| **Evidencia** | `docs/evidence/public-web-aior-nelvyon/FINAL_QUALITY_CERTIFICATE.md` + smokes prod abajo |
| **Mapa** | `docs/ops/AIOR_NELVYON_FULL_TEMPLATE_MAP.md` (**temporal**) |
| **claimReady** | **false** (OK visual CEO + URLs definitivas sin noindex) |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **Revisión visual CEO** en prod (`https://nelvyon.com` + `/www/mapa-plantillas.html`).
2. Decidir URLs definitivas (quitar `noindex` / canonical `/www/*`).
3. Opcional: fotos reales de equipo.
4. Commit docs HANDOVER/DEPLOYMENTS si quedan WIP locales no relacionados.

## Gates

```bash
node scripts/content-aior-nelvyon-only.mjs
node scripts/certify-aior-nelvyon-content.mjs
node scripts/certify-aior-www-final-quality.mjs --base=http://127.0.0.1:3013
# Playwright: e2e/www-live-qa.spec.ts → 10/10 (base :3013)
# → grade PASS · realErrorCount 0 · CSP frame-src Google OK
```
