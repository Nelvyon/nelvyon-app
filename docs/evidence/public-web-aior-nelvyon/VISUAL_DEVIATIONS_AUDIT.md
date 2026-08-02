# Auditoría de desviaciones visuales vs AIOR original

**Fecha:** 2026-08-02  
**Fuente original:** `.reference/aior/download-version` (Envato YX46UCV)  
**Pack publicado:** `apps/web/public/www`  
**Regla CEO:** AIOR visual 99% · contenido NELVYON 100% · **sin capturas SaaS** · **sin deploy** hasta cumplir.

---

## Comparación

| Ítem | AIOR original | `/www` actual (antes de revertir) |
|------|---------------|-----------------------------------|
| HTML demos | 40 (incl. Home 03/11) | 36 (03/11 excluidas a propósito) |
| Imágenes con bytes distintos | — | **315** archivos |
| Imágenes idénticas | — | 246 |
| Solo en www (extra) | — | 26 (p.ej. `assets/img/nelvyon/*`) |
| `style.css` | 754227 bytes | 754384 (+ override NELVYON) |
| Paths HTML → saas-shots | 0 | 0 (sustitución fue en disco) |

---

## Lista EXACTA de cambios visuales (a revertir)

### 1. Sustitución masiva de media (PROHIBIDO)
- **`fix-aior-selective-media.mjs`**: ~295 reemplazos en disco → `saas-shots`, CEO crops, etc.
- **`fidelity-aior-media-pass.mjs`**: 123 reemplazos adicionales (evidencia `media-fidelity-pass.json` / `media-fidelity-final-report.json`).
- Ejemplos documentados:
  - `normal/about-img1.jpg` ← `saas-shots/crm.webp`
  - `blog/blog_1_1.jpg` ← `saas-shots/settings.webp`
  - `pages/home-ai-agent.jpg` ← `saas-shots/agentes.webp`
  - `service/service_1_1.jpg` ← `saas-shots/crm.webp`
  - `normal/hero-image4.png`, `about_2_1.jpg`, etc. (tamaños distintos al original)

### 2. Inyección de capturas SaaS (`brand-aior-nelvyon.mjs` → `injectSaasShots`)
- Carpeta `assets/img/nelvyon/*.webp` (pipeline, crm, workflows, ai, campanias, dashboard, agentes).
- Sobrescritura de slots `normal/*` y `project/*`.
- Parches HTML `*.png` → `assets/img/nelvyon/*.webp` (puede haberse deshecho en pass posteriores).

### 3. Colores de tema (cambio de estilo — REVERTIR)
- Mapa `#7B5DFF/#D4FF12/#FF1CA4/…` → `#0084FF/#33A1FF/…` en HTML/CSS.
- Append en `style.css`:
  ```css
  :root { --theme-color: #0084FF !important; --theme-color2: #33A1FF !important; }
  ```

### 4. Lo que SÍ se mantiene (permitido por CEO)
- Logos NELVYON (`logo.svg`, `logo-white.svg`, `logo-black.svg`, `logo-icon.svg`, `logo1…`).
- Textos / precios / botones / enlaces / formularios / SEO / legales (contenido).
- Exclusión Home 03 (image-generate) y Home 11 (finance-crypto) ± `-op`.

### 5. No es desviación de diseño AIOR
- `mapa-plantillas.html` (índice interno noindex).
- Redirects Next `/agencia` → `/www/…` (routing, no composición).

---

## Acción de reversión (sin deploy)

1. Restaurar `assets/img/**` desde `.reference/aior/download-version/assets/img`.
2. Restaurar `assets/css/**` (incl. `style.css` sin override).
3. Eliminar `assets/img/nelvyon/`.
4. Reaplicar **solo** logos NELVYON.
5. En HTML: devolver cualquier `assets/img/nelvyon/*` a paths AIOR originales.
6. Desactivar en pipeline: `injectSaasShots`, `injectBrandCss`, `COLOR_MAP`, y scripts fidelity/selective.
7. **No deploy** hasta verificación visual AIOR ≈ 99%.
