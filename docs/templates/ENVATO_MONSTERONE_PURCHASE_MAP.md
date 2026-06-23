# Mapa de descargas — Envato Elements + Aceternity

> **Actualizado:** solo Envato Elements y Aceternity UI Pro (sin MonsterONE).

**Tabla maestra generada (3.500+ filas):** [`ENVATO_ACETERNITY_DOWNLOADS_TABLE.md`](./ENVATO_ACETERNITY_DOWNLOADS_TABLE.md)

Regenerar tras editar el catálogo:

```bash
pnpm --dir apps/web exec tsx ../../scripts/templates/generate-downloads-table.mts
```

Este archivo sustituye al antiguo mapa MonsterONE. Ver también `TEMPLATE_LIBRARY_MASTER_PLAN.md`.

---

## Flujo seed → nativo

```
Compra/licencia → Storage privado (NO repo público)
       ↓
Ingestión (script) → metadata.json + license_id
       ↓
Extracción patrones → bloques Nelvyon + tokens diseño
       ↓
QA score (quality/conversion/speed/premium)
       ↓
Registro nelvyon_native → packs + OS + BlockRenderer
       ↓
Cliente recibe URL Nelvyon / export HTML generado
```

**Nunca:** servir `source.zip`, HTML del tema, ni assets con marca del vendor.

---

## Lista priorizada de categorías a comprar

### P0 — Comprar antes de escalar packs (fin de semana / semana 1)

| # | Categoría | Vendor | Cantidad | Servicios | Sectores |
|---|-----------|--------|----------|-----------|----------|
| 1 | Landing pack multipágina SaaS/startup | Envato Elements | 15 | landing, saas_b2b, funnel | SaaS, agencia |
| 2 | Landing negocio local multipack | MonsterONE | 20 | local, landing, seo | restaurante, dental, gym, legal, belleza |
| 3 | Ecommerce landing + colección + promo | Envato Elements | 12 | ecommerce, ads | moda, electrónica, hogar |
| 4 | Email HTML kits transaccionales + newsletter | Envato Elements | 25 | email | todos |
| 5 | Aceternity UI Pro (ya en repo) | Aceternity | 4 bundles | landing, brand | SaaS, agencia |

### P1 — Mes 1–3

| # | Categoría | Vendor | Cantidad | Uso seed |
|---|-----------|--------|----------|----------|
| 6 | Creatividades Meta/Instagram coaches | Envato Elements | 30 | hooks UGC, stories |
| 7 | Google Display responsive kits | MonsterONE | 20 | banners por tamaño |
| 8 | Funnel kits squeeze→webinar→upsell | MonsterONE | 10 | composiciones funnel |
| 9 | Blog/magazine SEO layouts | Envato Elements | 15 | content_page, seo_page |
| 10 | Restaurante menú + reservas | MonsterONE | 8 | bloques menu, booking |
| 11 | Legal/professional trust layouts | MonsterONE | 6 | despacho, asesoría |

### P2 — Mes 4+

| # | Categoría | Vendor | Cantidad |
|---|-----------|--------|----------|
| 12 | Pitch deck / informe agencia | Envato Elements | 8 |
| 13 | Real estate listing kits | MonsterONE | 10 |
| 14 | Fitness challenge landing kits | Envato Elements | 8 |
| 15 | Infoproducto lanzamiento | Envato Elements | 12 |
| 16 | Social carousel Canva-style | Envato Elements | 40 |
| 17 | WooCommerce storefront skins | MonsterONE | 10 |
| 18 | Video sales letter thumbnails | Envato Elements | 15 |

---

## Por categoría: uso como seed

### Ejemplo: «Landing pack SaaS» (P0)

| Paso | Acción |
|------|--------|
| Compra | Suscripción Elements; descarga 15 HTML/React landings |
| Storage | `templates/monsterone/SaaS/{template_id}/source.zip` + `license.txt` |
| Metadata | `template_id`, `license_id: lic-envato-elements-2026`, `redistribution: none` |
| Ingestión | Script extrae: hero, pricing grid, testimonial row, FAQ, footer CTA |
| Conversión | Cada sección → entrada en `NELVYON_BLOCK_CATALOG` + 1 `landing-*-*-v1` |
| QA | Scores ≥ 85 quality para `status: active` |
| Entrega | Pack kickoff usa `resolveTemplate()` → bloques React nativos |

### Ejemplo: «Email kit ecommerce» (P0)

| Paso | Acción |
|------|--------|
| Seed | 25 HTML emails (carrito, welcome, promo) |
| Conversión | Tokens `--color-primary`, fuentes Inter → design system |
| Output | `email-*-*` en registry + secuencias `seq-ecom-*` |
| Envío | SES con HTML generado desde plantilla React, no HTML crudo del kit |

### Ejemplo: «Meta ads coaches» (P1)

| Paso | Acción |
|------|--------|
| Seed | PSD/Canva/Figma exports |
| Conversión | `ad_creative` JSON: headline variants, hook, format, placeholder image |
| IA | Pack rellena copy; estructura CRO de la semilla |

---

## Gestión de licencias

Registro en código: `apps/web/src/lib/template-library/license.ts`

| Campo | Significado |
|-------|-------------|
| `license_id` | Referencia interna |
| `vendor` | envato_elements \| monsterone \| aceternity_ui_pro |
| `redistribution` | Siempre `none` para seeds |
| `subscription_ref` | Cuenta Elements/MonsterONE |

Por plantilla seed en storage:

```json
{
  "template_id": "seed-landing-saas-042",
  "license_id": "lic-envato-elements-2026",
  "vendor_item_ref": "internal-sku-only",
  "redistribution_allowed": false,
  "converted_to": ["landing-saas-demo-v1"],
  "nelvyon_owned_output": true
}
```

**Propiedad Nelvyon:** el código React, bloques, composiciones y copy regenerado son tuyos. La semilla no sale del perímetro interno.

**Git:** no commitear ZIPs ni fuentes con licencia restrictiva. `.gitignore`: `templates/monsterone/**/source.zip`, `templates/_extracted/**` (opcional: solo manifest en repo).

---

## Código de referencia

- Mapa compras: `apps/web/src/lib/template-library/seed-sources.ts`
- Manifest Aceternity: `apps/web/src/lib/template-library/ingest/aceternity-manifest.ts`
- Schema producción: `backend/autonomous/templates/template_registry_production.json`
- Scan seeds: `node scripts/templates/scan-aceternity-seeds.mjs`
