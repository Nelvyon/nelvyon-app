# Informe final — Web pública AIOR → NELVYON (candidato a producción)

**Fecha:** 2026-08-02  
**Deploy:** **NO** (sin aprobación CEO)  
**claimReady:** **false** (faltan OK visual CEO + URLs definitivas + datos registrales si aplica)

## Veredicto

La base AIOR está convertida a NELVYON **sin reconstruir layout/HTML/CSS/JS**.  
Candidata a producción **técnica** con gates de pack PASS.  
**No** se declara producto “terminado/perfecto”: quedan decisiones humanas (URLs, SEO indexable, revisión visual CEO).

## Qué se cambió (esta pasada)

- Contenido residual EN / demo / cifras vanity / chiropractic / nombres falsos → ES NELVYON (pass6+pass7 + fixes estructurales).
- Contadores partidos en spans (`500K+`, `2.5B+`, …) → etiquetas honestas (`CRM`, `SES`, `API`, `Inbox`, `Packs`, `SaaS`, `OS`).
- Precios: Starter €97 / Growth €297 / Elite €797 / Agencia a medida.
- Hero `hero_bg_1.jpg` + counters: fondos claros (contraste legible; sin tocar CSS AIOR).
- Certify: nombres falsos (Jems Colin, etc.) en FORBIDDEN.
- Rutas marketing → `/www/*` (commits previos).

## Páginas revisadas

**36 HTML** del pack (homes + internas; excl. Home 03/11). + `mapa-plantillas.html` auxiliar.

Auditoría página a página: `page-by-page-audit.json` / `audit-aior-www-pages` → **36/36 ok**, 0 broken images/links, 0 forbidden.

## Gates (evidencia)

| Gate | Resultado |
|------|-----------|
| Typecheck (`tsc --noEmit`) | **PASS** |
| ESLint public-web | **PASS** (scoped) |
| Playwright marketing (7) | **PASS** (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010`) |
| Certify contenido | **PASS** EN0 / forbidden0 / noindex 36/36 |
| Audit páginas www | **PASS** 36/36 |
| Build Next | **PASS** (pasada previa en sesión; no re-ejecutado en este cierre por tiempo) |
| Crawl / content-sweep | **PASS** tras servir `/www` (sesión previa; www ya no gitignored salvo mp4) |
| Lighthouse | Histórico sesión: perf ~55, a11y ~80–91, SEO ~61–69 **penalizado por `noindex` + redirects**; no optimizado como gate de cierre hasta URLs definitivas |

## Capturas

- `docs/evidence/public-web-aior-nelvyon/screenshots/index-desktop.png`
- `docs/evidence/public-web-aior-nelvyon/screenshots/index-mobile.png`

## Problemas encontrados y corregidos

| Problema | Corrección |
|----------|------------|
| EN vivo (Contact Us, Active Users, Price Table, …) | Phrase swaps + regex estructurales |
| Cifras falsas en counters (spans partidos) | Sustitución HTML de `box-number` |
| Pricing chiropractic / Robentix | Planes SaaS reales NELVYON |
| `Product`→`Producto` → Productoo/Productoion | Eliminado swap peligroso; typos reparados |
| `Microsoft Team`→`Teams` doble | Eliminado; normalizado a Microsoft Teams |
| Contraste hero (texto oscuro sobre SaaS oscuro) | Hero/counters con foto clara + veil |
| `/www` 404 en `next start` | Dejar de gitignorar el pack (salvo mp4) |

## Pendiente (humano / producto)

1. Revisión visual final CEO (`/www/mapa-plantillas.html` + homes).
2. URLs/navegación definitivas (hoy canonical `/www/*` + `noindex`).
3. Datos registrales legales si aún hay placeholders en rutas React legales.
4. MP4 grandes fuera de git (`www/**/*.mp4`) — regenerar en deploy o servir aparte.
5. Deploy **solo** con OK explícito.

## Cómo regenerar

```bash
node scripts/brand-aior-nelvyon.mjs
node scripts/content-aior-nelvyon-only.mjs
node scripts/fidelity-aior-media-pass.mjs
node scripts/fix-aior-www-broken-refs.mjs
node scripts/audit-aior-www-pages.mjs
node scripts/certify-aior-nelvyon-content.mjs
```

**Nota:** re-ejecutar fidelity puede sobrescribir fondos de hero/counters; tras fidelity, reaplicar brillo de hero si hace falta.
