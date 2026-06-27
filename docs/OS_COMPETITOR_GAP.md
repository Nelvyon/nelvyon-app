# OS Competitor Gap Pack (O24)

The operator pastes their own domain + a competitor URL; Nelvyon derives the
SEO/content/CRO gaps, scores them, recommends the right pack, and can launch it.

## Input / output

**Input:** `ownDomain`, `competitorUrl`, optional `sector` / `hasProductCategory`.

**Output (per run):**
- `gaps[]` — `{ category: keyword|content|cro|strategy, severity: high|medium|low, title, detail }`
- `gapScore` — 0-100 (severity-weighted: high 25 / medium 15 / low 8, capped)
- `recommendedPackId` + `recommendedSkus`
- `agentData` — provider + top keywords/competitors from O21
- `reportHtml` — dark-glass HTML report (own vs competitor, gaps table, score, pack)

## How gaps are derived (deterministic v1)

Over O21 agent data (`fetchKeywordSnapshot` + `fetchCompetitorSnapshot`, best-effort):
- **keyword** — own has 0 keywords (high), competitor organic ≫ own (high), or low
  coverage (<10, medium)
- **content** — always a structure review (hero / social proof / FAQ / CTA)
- **cro** — proxy from competitor traffic strength (>5k → high)

If no SEO provider is configured, `agentData.provider = none` and gaps fall back to
the structural heuristics (still useful, no silent mock — the UI shows the provider).

## Mapping gaps → pack

`recommendPack(gaps, { sector, hasProductCategory })`:
- CRO/trust dominant → `cro-audit-pack`
- strategy/content dominant → `content-strategy-pack`
- keyword/content heavy → `ecommerce-growth` (product context) or `local-business-growth`

## Relation to O21 agent data

The service consumes `OsAgentDataService` snapshots (Semrush → cache → empty). The
cached agent data is also embedded in the report and the launched pack's brief
(`_competitor_gap`).

## Launching a pack from a gap run

`POST /api/os/competitor-gap/[id]/launch { execute: true }` builds a brief patch
(own domain + competitor + gaps summary) and creates a Brief-to-Launch launch
(`SaasBriefToLaunchService.createLaunch`), saving `launch_id` (+ `pack_run_id` when
available) on the gap run.

## APIs

- `GET /api/os/competitor-gap` → `{ summary, runs[] }`
- `GET /api/os/competitor-gap/[id]` → run detail
- `GET /api/os/competitor-gap/[id]/html` → `text/html` report
- `POST /api/os/competitor-gap/analyze` → start + analyze + complete (sync v1)
- `POST /api/os/competitor-gap/[id]/launch` → launch recommended pack

Dashboard: `/os/competitor-gap`. No heavy scraper/puppeteer in v1.
