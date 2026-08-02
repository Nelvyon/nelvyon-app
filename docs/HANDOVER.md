# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-02** — Foco: **AIOR visual 99% + contenido NELVYON · deploy en curso**

| Campo | Valor |
|-------|-------|
| **Regla** | AIOR visual intacto · solo logo/textos/precios/SEO · **0 saas-shots** |
| **Evidencia** | `VISUAL_FIDELITY_PREDEPLOY.md` · `VISUAL_DEVIATIONS_AUDIT.md` · certify PASS |
| **claimReady** | **false** hasta validación prod post-deploy |
| **Canary** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Tras deploy SUCCESS: validar nelvyon.com (hero AIOR, sin saas-shots, textos NELVYON).
2. OK visual CEO.
3. URLs definitivas (quitar noindex) cuando proceda.

## Gates locales (pre-push)

```bash
# visual: nonLogoDiff=0 · style.css AIOR · sin assets/img/nelvyon
node scripts/audit-aior-www-pages.mjs          # 36/36
node scripts/certify-aior-nelvyon-content.mjs  # EN0
node scripts/certify-aior-www-final-quality.mjs # PASS realErrorCount 0
```
