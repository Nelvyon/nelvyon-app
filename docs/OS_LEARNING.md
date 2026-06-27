# OS Learning Loop — GA4 → Seed Selector Weights

The learning loop reads real conversion data from Google Analytics 4 monthly and adjusts which OS sectors get priority in the seed-selector.

> **O20 — Production loop + audit trail.** The cron now delegates to
> `OsLearningLoopProdService.runProdLoop()`: aggregates GA4 sector CVR across active
> `integration_ga4` users, re-ranks templates (autonomous M/N/P), persists
> `learning_rank` / `learning_score` on `os_envato_seed_registry`, and writes an
> idempotent row to **`os_learning_run_log`** (unique `period_key` + `trigger_source`).
> Visible in **`/os/learning`** (KPIs, run history, top sectors by CVR, GA4 mode
> `real|mock|none`) and triggerable via `POST /api/os/learning/trigger` (admin,
> idempotent). No active GA4 integrations → run recorded `skipped`
> (`metadata.reason = "no_ga4"`). Sector ids come from the 20-sector registry (O16).

---

## How it works

```
Railway Cron (1st of month, 06:00 UTC)
  → GET /api/cron/os-learning-loop
      → integration_ga4 (all active users)
      → GA4 Data API: pagePath × sessions × conversions (last 90 days)
      → pathToSector() — maps URLs to OS sector names
      → CVR = conversions / sessions per sector
      → UPSERT os_seed_weights (sector, cvr, sessions, conversions)
```

---

## Sector weight usage

After the loop runs, `OsLearningService.getSectorWeights()` returns `Record<sector, cvr>`.

The orchestrator can call `getTopSectorsByCvr(weights, 5)` from `seed-selector.ts` to get the five highest-converting sectors and prioritise pack runs for those.

Within a sector, `rankSeedsByCvr(seeds, sectorCvr, avgCvr)` re-ranks seeds:
- **Above average CVR**: envato templates first (exploit known-good templates)
- **Below average CVR**: synthetic seeds surfaced earlier (explore new templates)

---

## Table: `os_seed_weights`

| Column | Type | Description |
|---|---|---|
| `sector` | TEXT (PK) | OS sector name (e.g. "dental", "ecommerce") |
| `cvr` | FLOAT | Conversion rate (conversions / sessions, last 90d) |
| `sessions` | INTEGER | Total sessions on matching pages |
| `conversions` | INTEGER | Total GA4 conversion events |
| `updated_at` | TIMESTAMPTZ | Last cron run timestamp |

---

## Railway cron setup

```
Schedule: 0 6 1 * *
Command:  curl -s -H "x-cron-secret: $CRON_SECRET" \
            "$NEXT_PUBLIC_APP_URL/api/cron/os-learning-loop"
```

Requires:
- `CRON_SECRET` — already in production
- Active GA4 integrations in `integration_ga4` table

---

## URL → sector mapping

`pathToSector()` matches pagePath substrings to OS sector names:

| Pattern | Sector |
|---|---|
| `/dental`, `/dentist` | `dental` |
| `/restaurant`, `/restaurante`, `/comida` | `restaurant` |
| `/ecommerce`, `/tienda`, `/shop` | `ecommerce` |
| `/clinica`, `/medico`, `/clinic` | `clinica` |
| `/hotel`, `/alojamiento` | `hosteleria` |
| `/abogado`, `/lawyer` | `legal` |
| `/academia`, `/curso`, `/school` | `educacion` |
| Direct sector name in path | That sector |

---

## Tests

```bash
pnpm -C apps/web exec vitest run backend/saas/__tests__/OsLearningService.test.ts
# 12 tests — runLearningLoop (8), getSectorWeights (2), getTopSectors (2)
```
