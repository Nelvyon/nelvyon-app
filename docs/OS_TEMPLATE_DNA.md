# OS Template DNA (O26)

"Template DNA" picks the best-converting seed per sector by fusing real signals, so
the pack orchestrator no longer always uses seed index 0.

## DNA score formula (v1 heuristic)

`computeDnaScore({ cvr, avgQa, learningRank, packRuns })` → 0-100:
- **40%** normalized sector CVR (GA4, O13) — `cvr / 0.20` capped at full points
- **40%** avg pack-run QA score (0-100); no QA data → neutral 70 baseline
- **20%** inverse learning rank (O20): rank 1 → 20pts, rank 10 → 2pts, no rank → 10pts

Capped to [0, 100].

## Sources

- **GA4 CVR** — `OsLearningService.getSectorWeights()` (O13/O20)
- **Pack QA** — `nelvyon_pack_runs.report` aggregated by `seed_id` (avg `kpis.avg_qa_score`)
- **Learning rank/score** — `os_envato_seed_registry.learning_rank` (set by O20)

Persisted to `os_template_dna_scores` (UNIQUE `sector_id + seed_id`).

## Effect on pack seed selection

`packOrchestrator.runSkuPipeline` calls
`getOsTemplateDnaService().getLearningRankMap(sector)` and passes it to
`getSeedByIndex(sector, 0, undefined, dnaRanks)`. The seed-selector reorders seeds by
DNA rank (lower rank = higher priority), so the top-DNA seed is chosen — falling back
to index 0 when there's no DNA data. Best-effort: any failure leaves the original
behavior intact.

## Refresh

- **Cron** — `/api/cron/os-learning-loop` calls `refreshAll()` after the O20 prod loop
  (best-effort, non-blocking).
- **Manual** — `POST /api/os/template-dna/refresh { sectorId? }`.

## APIs

- `GET /api/os/template-dna` → `{ summary, topSeeds[], sectors[] }`
- `GET /api/os/template-dna/[sectorId]` → sector scores + rank map
- `POST /api/os/template-dna/refresh` → recompute (one sector or all 20)

Dashboard: `/os/template-dna`. No ML/fine-tuning in v1 — fixed heuristic.
