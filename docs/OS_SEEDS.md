# OS Seeds — Nelvyon

Seeds provide headline templates, CTAs, and chatbot greetings for sector agents.
They enrich AI prompts so generated content is more specific and higher quality.

## Seed priority

1. **Envato on-disk seeds** — `backend/data/envato-seeds/{sector}/*.json`
   Downloaded via `download-envato-seeds.ts` when `ENVATO_ELEMENTS_TOKEN` is set.
2. **Synthetic JSON seeds** — `backend/os-agents/seeds/{sector}.json`
   Curated templates checked into the repo. Used when Envato seeds are absent.

The `getSectorSeeds(sector, limit?)` function in `seed-selector.ts` handles this fallback automatically.

## Metadata index

`backend/data/envato-seeds-metadata.json` — 51 items across 3 sectors (restaurantes, clinicas, ecommerce).

When Envato seeds are downloaded, each item is stored as:
- `backend/data/envato-seeds/{sector}/{item_id}.json` — metadata only
- ZIPs are **NOT** committed (`.gitignore` entry: `backend/data/envato-seeds/**/*.zip`)

## How to re-download Envato seeds

Requires `ENVATO_ELEMENTS_TOKEN` (Envato Elements API Bearer token).

```bash
# One-time download (~50 items across 3 sectors)
ENVATO_ELEMENTS_TOKEN=your_token_here npx tsx backend/os-agents/seeds/download-envato-seeds.ts

# Output:
#   backend/data/envato-seeds/restaurantes/*.zip
#   backend/data/envato-seeds/clinicas/*.zip
#   backend/data/envato-seeds/ecommerce/*.zip

# Then commit the metadata JSON files only (not ZIPs):
git add backend/data/envato-seeds/**/*.json backend/data/envato-seeds-metadata.json
git commit -m "chore(seeds): refresh envato seeds metadata"
```

## Sector coverage — TOP 10 (O7)

All 10 priority sectors in `sectorPriority.ts` have seed support.

| Sector | Synthetic seeds | Envato seeds | Pack | shared.ts location |
|---|---|---|---|---|
| restaurantes | `seeds/restaurantes.json` (20) | `data/envato-seeds/restaurantes/` | local-business-growth | `sectors/restaurantes/` |
| clinicas | `seeds/clinicas.json` (20) | `data/envato-seeds/clinicas/` | local-business-growth | `sectors/health/` |
| estetica | `seeds/estetica.json` (20) | — | local-business-growth | `sectors/estetica/` |
| realestate | `seeds/realestate.json` (20) | — | local-business-growth | `sectors/realestate/` |
| retail | `seeds/retail.json` (20) | — | local-business-growth | `sectors/retail/` |
| ecommerce | `seeds/ecommerce.json` (20) | `data/envato-seeds/ecommerce/` | ecommerce-growth | `sectors/ecommerce/` |
| moda | `seeds/moda.json` (20) | — | ecommerce-growth | `sectors/fashion/` |
| saasb2b | `seeds/saasb2b.json` (20) | — | saas-b2b-growth | `sectors/saasb2b/` |
| consultoria | `seeds/consultoria.json` (20) | — | saas-b2b-growth | `sectors/consultoria/` |
| fintech | `seeds/fintech.json` (20) | — | saas-b2b-growth | `sectors/fintech/` |

> Note: `clinicas` maps to `sectors/health/` and `moda` maps to `sectors/fashion/` — seed file names follow `sectorPriority.ts seedFile` field.

## Deliverable metadata (O7)

Every deliverable created by `packOrchestrator.ts` now includes:

```json
{
  "seed_id": "restaurantes_tpl_0",
  "source": "synthetic"
}
```

## Integration with sector agents

Each sector's `shared.ts` calls `getSeedByIndex(sector, index)` to inject a seed template into the AI prompt:

```typescript
// Example from restaurantes/shared.ts
const seed = getSeedByIndex("restaurantes", params.seedIndex ?? 0);
const seedCtx = seed
  ? `\nSEED TEMPLATE:\n- Headline: ${seed.headline}\n- CTA: ${seed.cta_label}`
  : "";
```

The seed context is appended to the agent's brief before LLM completion.
Agents use `seedIndex % seeds.length` for deterministic, wrapping selection.

## Envato Elements API

- Base URL: `https://elements.envato.com/api`
- Auth: `Authorization: Bearer {ENVATO_ELEMENTS_TOKEN}`
- Rate limit: 300ms between requests (handled in `download-envato-seeds.ts`)
- Items per sector: ~17 (configurable via `ITEMS_PER_SECTOR` in the script)
