# Certificado de calidad absoluta — Web pública NELVYON (local)

**Fecha:** 2026-08-03  
**Ámbito:** pack publicado en `apps/web/public/www`  
**Deploy:** **NO** (validación local previa)  
**claimReady:** **false** hasta OK visual CEO

---

## Estructura certificada (19 páginas)

| # | Página publicada | Original AIOR | Rol |
|---|------------------|---------------|-----|
| 1 | `index.html` | `home-ai-chatbot-tool.html` | Home 08 — Agencia / Inicio |
| 2 | `saas.html` | `home-ai-chatbot.html` | Home 02 — SaaS |
| 3–19 | interiores | mismos nombres | about, features, integrations, pricing, contact, faq, case-studies, case-studies-2, case-studies-details, cases, blog, blog-details, team, team-details, testimonial, typography, error |

**Nota sobre “19 Homes”:** por instrucción CEO previa, **no** se publican las demás Homes AIOR (01, 03–07, 09–…). El certificado cubre las **19 páginas publicadas** (2 Homes + 17 interiores). Las miniaturas de mega-menú de demos (`assets/img/pages/home-*`) se omiten a propósito al simplificar la navegación.

---

## Gates obligatorios

| Gate | Resultado | Evidencia |
|------|-----------|-----------|
| 0 inglés residual (auditoría + deep scan) | **PASS** | `absolute-quality-audit.json` · `deep-en-snippets.mjs` sin hits |
| 0 AIOR visible | **PASS** | audit |
| 0 ThemeHour | **PASS** | audit |
| 0 Lorem Ipsum | **PASS** | audit |
| 0 placeholders demo | **PASS** | audit (`[PENDIENTE_DATOS_REGISTRALES]` permitido solo legales) |
| 0 nombres ficticios | **PASS** | Anya/Carlos/John/Michel/etc. neutralizados |
| 0 datos demo ($ créditos, 44%, teléfonos FL, etc.) | **PASS** | precios `—/plan`; contacto registral pendiente marcado |
| 0 imágenes rotas (refs locales) | **PASS** | audit + smoke · `brokenImgs: []` en Home 08 |
| 0 enlaces rotos `.html` locales | **PASS** | audit + `www-http-smoke.mjs` |
| HTTP 200 todas las páginas en `:4173` | **PASS** | `www-http-smoke.mjs` |
| Verde → azul `#0084FF` | **PASS** | `theme7` / `theme` en `style.css` |
| 0 Homes extra publicadas | **PASS** | `home-*.html` = 0 |
| Fidelidad estructural AIOR vs NELVYON | **19/19 PASS** | `fidelity-compare-page-by-page.json` (secciones, body class, CSS/JS, imgs de cuerpo; excluye thumbs mega-menú demos) |
| Layout/CSS/JS/imágenes/mockups intactos | **PASS** | solo logo SVG, textos, nav, enlaces, forms, SEO, color CSS vars |
| Consola (Home 08 local) | **PASS*** | sin imágenes rotas en DOM; *sin errores JS bloqueantes observados en smoke local |

\* Consola: comprobación Runtime en `http://localhost:4173/` — `brokenImgs: []`. No se declara “producto terminado”; solo pack local certificado.

---

## Comparación página a página (resumen)

Todas las filas en `fidelity-compare-page-by-page.json`:

- `structMatch: true` (secciones / header / footer / `body.class`)
- `assetMatch: true` (refs `assets/css` + `assets/js`)
- `imgMatch: true` tras excluir thumbs de Homes no publicadas del mega-menú

Cambios permitidos verificados: logo NELVYON, nombre, azul `#0084FF` / `#33A1FF`, textos ES, botones, enlaces, formularios (`/api/contact` en contact), SEO (`noindex` temporal), legales.

---

## Pendientes reales (no bloquean el certificado de pack local)

1. **`[PENDIENTE_DATOS_REGISTRALES]`** — dirección/teléfono reales cuando existan.
2. **Precios** orientativos (`—/plan`) — definir importes reales de negocio antes de indexar.
3. **`noindex`** temporal — quitar solo tras OK CEO + deploy.
4. **Otras Homes AIOR** — fuera de publicación a propósito; no forman parte de este pack.
5. **claimReady** permanece **false** hasta OK visual CEO.

---

## Cómo reproducir

```bash
node scripts/rebuild-aior-home08-saas02.mjs
node scripts/content-pass-absolute-es.mjs
node scripts/content-pass-final-sweep.mjs
# (si aplica) node scripts/rebrand-restored-interiors.mjs
npx --yes serve apps/web/public/www -l 4173
node scripts/audit-www-absolute-quality.mjs
node scripts/deep-en-snippets.mjs
node scripts/compare-aior-fidelity.mjs
node scripts/www-http-smoke.mjs
```

**Veredicto local:** pack **certificado para revisión CEO**. **No deploy** hasta su OK explícito.
