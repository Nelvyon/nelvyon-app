# OS Seeds — 20 Sector Agents

Seed registry at `apps/web/src/lib/packs/sectorSeeds.ts`.  
API: `getSeedByIndex(sectorId, index)` → `SectorSeed | null`

Each seed contains: `seed_id`, `prompt` (non-empty), `output_schema`, `landing_headline`, `meta_title`, `meta_desc`, `chatbot_greeting`, `blog_h1_ideas`.

---

## TOP 10 (original sectors)

| # | `sector_id` | Label | Sensitivity | Regulated | Seeds |
|---|---|---|---|---|---|
| 1 | `dental` | Clínicas dentales | high | ✅ | 1 |
| 2 | `legal` | Despachos de abogados | high | ✅ | 1 |
| 3 | `fitness` | Gimnasios / fitness | medium | ❌ | 1 |
| 4 | `beauty` | Clínicas estéticas | high | ✅ | 1 |
| 5 | `restaurant` | Restaurantes | low | ❌ | 1 |
| 6 | `real_estate` | Inmobiliarias | medium | ❌ | 1 |
| 7 | `ecommerce` | Ecommerce / tiendas online | medium | ❌ | 1 |
| 8 | `solar` | Instaladores solares | medium | ✅ | 1 |
| 9 | `coaching` | Coaches y mentores | low | ❌ | 1 |
| 10 | `saas_b2b` | SaaS B2B | low | ❌ | 1 |

## +10 (new sectors — O9)

| # | `sector_id` | Label | Sensitivity | Regulated | Seeds |
|---|---|---|---|---|---|
| 11 | `veterinaria` | Clínicas veterinarias | medium | ❌ | 1 |
| 12 | `educacion` | Academias y centros educativos | low | ❌ | 1 |
| 13 | `turismo` | Turismo y alojamiento | low | ❌ | 1 |
| 14 | `construccion` | Construcción y reformas | medium | ❌ | 1 |
| 15 | `automocion` | Concesionarios y talleres | medium | ❌ | 1 |
| 16 | `logistica` | Logística y transporte B2B | medium | ❌ | 1 |
| 17 | `seguros` | Corredurías de seguros | high | ✅ | 1 |
| 18 | `contabilidad` | Asesorías fiscales y gestorías | medium | ✅ | 1 |
| 19 | `hosteleria` | Hoteles y hostelería | low | ❌ | 1 |
| 20 | `tecnologia` | Agencias IT / desarrollo software | low | ❌ | 1 |

---

## Seed structure

```typescript
type SectorSeed = {
  seed_id: string;          // e.g. "dental_tpl_0"
  sector: string;
  prompt: string;           // non-empty agent prompt (≥20 chars)
  output_schema: { fields: string[] };  // includes landing_headline, meta_title, chatbot_greeting
  landing_headline: string;
  landing_subheadline: string;
  meta_title: string;
  meta_desc: string;
  chatbot_greeting: string;
  blog_h1_ideas: string[];
};
```

Template variables: `{{business_name}}`, `{{city}}`, `{{value_proposition}}`, `{{primary_cta}}`.

---

## Integration with packOrchestrator

In `runSkuPipeline`, deliverable metadata receives:

```typescript
{
  seed_id: seed?.seed_id ?? `${sector}_tpl_0`,
  source: "synthetic",
  sector: intake.sector,
  prompt_preview: seed?.prompt.slice(0, 80),
}
```

`getSeedByIndex(sector, 0)` is called per-SKU run. When the sector is registered, the real `seed_id` from the registry is used. Unknown sectors fall back to the legacy `${sector}_tpl_0` format.

---

## Descarga masiva Envato (500 seeds, 10 sectores)

El índice `backend/data/envato-seeds-metadata.json` contiene **500 entradas sintéticas** (10 sectores × 50) listas para usar sin descargar ZIPs.

### Sectores cubiertos

`dental`, `legal`, `fitness`, `beauty`, `restaurant`, `real_estate`, `ecommerce`, `solar`, `coaching`, `saas_b2b`

### Prioridad en seed-selector

1. **On-disk** — `backend/data/envato-seeds/{sector}/*.json` (descargados con el script)
2. **Metadata index** — `backend/data/envato-seeds-metadata.json` (500 entradas sintéticas)
3. **Synthetic JSON** — `backend/os-agents/seeds/{sector}.json` (legacy)

### Descargar ZIPs desde Envato (opcional)

```bash
# Requiere ENVATO_TOKEN en .env
pnpm tsx backend/os-agents/seeds/download-envato-seeds.ts

# Regenerar solo el metadata index (sin descarga)
node scripts/generate-envato-metadata.mjs
```

El script descarga 50 items × 10 sectores = 500 archivos individuales en `backend/data/envato-seeds/{sector}/`.
Los ZIPs están en `.gitignore`; solo el JSON de metadata se commitea.

### Usar un seed específico

```typescript
import { getSectorSeeds, getSeedByIndex } from "@/backend/os-agents/seeds/seed-selector";

// Todos los seeds de un sector (máx 50)
const seeds = getSectorSeeds("dental", 50);

// Seed determinístico por índice de job (wraps around)
const seed = getSeedByIndex("dental", jobIndex);
```

---

## Tests

```bash
pnpm -C apps/web exec vitest run src/lib/packs/__tests__/sectorSeeds.test.ts
# 107 tests — all 20 sectors × (seed_id, prompt, output_schema, template fields) + edge cases
```
