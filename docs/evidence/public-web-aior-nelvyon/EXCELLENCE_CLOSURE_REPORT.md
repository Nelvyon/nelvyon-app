# Informe de cierre — excelencia web pública NELVYON

**Fecha:** 2026-08-02  
**Deploy:** NO  
**Estructura AIOR:** intacta (sin reconstrucción HTML/CSS/JS/layout)

## Veredicto de excelencia

Tras auditoría de contenido + media + muestreo visual desktop/móvil y corrección de todo lo que delataba plantilla (copy repetido, datos ficticios, EN residual, precios cruzados, descuento inventado), la web es **publicable como candidata de excelencia de producto**.

**No** se declara “cerrada para indexar en producción” mientras existan decisiones humanas explícitas (abajo).  
**Sí** se declara el pack `/www` **sin trabajo a medias de contenido/media** respecto al estándar NELVYON.

## Páginas revisadas

36 HTML de producto (+ `mapa-plantillas.html` auxiliar):

Homes: `index`, `home-ai-startup`±op, `home-ai-chatbot`±op, `home-ai-writer-tool`±op, `home-business-intelligence`±op, `home-ai-agent`±op, `home-productivity-tools`±op, `home-ai-chatbot-tool`±op, `home-cloud-based-saas`±op, `home-saas-product-showcase`±op  

Internas: `about`, `features`, `pricing`, `contact`, `faq`, `integrations`, `case-studies`±2±details, `cases`, `blog`±details, `team`±details, `testimonial`, `typography`, `error`

## Problemas encontrados (excelencia)

| # | Problema | Severidad |
|---|----------|-----------|
| 1 | Copy idéntico “Integraciones y webhooks…” en 5 pasos | Alta |
| 2 | Checklist about duplicado (plantilla) | Alta |
| 3 | Contador SES ilegible (“ES”) | Alta |
| 4 | “Works Process” / STEP en inglés | Alta |
| 5 | Form placeholders EN (Full Name, Phone…) | Alta |
| 6 | Dirección Fort Lauderdale + teléfonos inventados | Crítica |
| 7 | Nombres de equipo inventados (Jems Olive, etc.) | Crítica |
| 8 | Premios EN ficticios (Awards Jury, D&AD…) | Alta |
| 9 | Select precios 4× “Demo del SaaS” | Media |
| 10 | Cards style2 con título/precio cruzados | Alta |
| 11 | Descuento “−35%” anual inventado | Alta |
| 12 | Anglicismos (Insights, kill-switch, data science) | Media |
| 13 | Perfiles/integraciones con textos clonados | Media |

## Problemas corregidos

Todos los de la tabla anterior, vía `content-aior-nelvyon-only.mjs` + `phrase-swaps-pass8.json` + parches estructurales (contacto, precios, proceso, equipo, awards).

## Capturas

- `screenshots/closure-index-desktop.png`
- `screenshots/closure-index-mobile.png` (si presente)
- `screenshots/excellence-index-desktop.png`
- `screenshots/excellence-pricing-desktop.png`
- `screenshots/index-mobile.png`

## Métricas finales

| Gate | Resultado |
|------|-----------|
| Audit páginas 36/36 | PASS · 0 broken img/links |
| Certify contenido | PASS · EN0 · forbidden0 |
| Playwright marketing | 7/7 PASS |
| Lighthouse (sesión) | perf~55 · a11y 80–91 · SEO 61–69 (noindex) |
| Typecheck | PASS (sesión) |

## Archivos modificados (este cierre)

- `apps/web/public/www/**/*.html` (regenerados/contenido)
- `scripts/content-aior-nelvyon-only.mjs`
- `scripts/data/aior-nelvyon-phrase-swaps-pass8.json`
- `scripts/excellence-content-sweep.mjs`
- `docs/evidence/public-web-aior-nelvyon/*`
- `docs/HANDOVER.md`, `docs/CHANGELOG.md`, `docs/ops/AIOR_NELVYON_TRANSFORM_STATUS.md`

## Pendientes reales (humanos — no bloquean calidad del pack)

1. **OK visual CEO** en todas las homes (densidad imagen↔sección).  
2. **URLs definitivas** — hoy `noindex` + canonical `/www/*` a propósito.  
3. **Fotos de equipo**: slots AIOR mantienen fotos stock; nombres ya son roles NELVYON (no personas inventadas). Sustituir por fotos reales cuando existan.  
4. **Datos registrales** en rutas legales React si aplica.  
5. **Deploy** solo con aprobación explícita.

## Respuesta a las preguntas de cierre

- ¿Parece hecha por un equipo de clase mundial? **En contenido y coherencia NELVYON, sí como candidata.** La plantilla AIOR sigue siendo la base visual (requisito).  
- ¿La publicaría con orgullo? **En staging/preview, sí.** En producción indexada, **después** de OK CEO + URLs.  
- ¿Queda algo que moleste? **noindex provisional** y fotos stock de “equipo” — documentados, no ocultos.
