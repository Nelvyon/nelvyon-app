# OS Agent Data — Semrush / DataForSEO in production (O21)

Brings real SEO data into the OS pack pipeline so SEO/strategist agents receive
actual keywords + competitors instead of LLM-only guesses.

## Providers

| Provider | Source | Config |
|---|---|---|
| `semrush` | `integration_semrush` (per-user) **or** env `SEMRUSH_API_KEY` (global) | existing `SemrushService` |
| `dataforseo` | `DataForSeoAdapter` | env `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` |
| `mock` / `none` | no provider configured → empty result, packs run LLM-only | — |

Provider resolution order (`OsAgentDataService.resolveProvider`):
**active Semrush integration → `SEMRUSH_API_KEY` env → DataForSEO configured → none.**

## Cache

- Table `os_agent_data_cache` (migration 469). Unique on
  `(COALESCE(tenant_id,''), provider, query_type, query_key)`.
- `query_key = <normalized-domain>:<database_code>` (lowercased, no scheme/www).
- TTL **24h** (`expires_at`). Cache hits skip the API call entirely.
- `api_key` is **never** stored or logged here — only the resulting payload.

## Pack orchestrator hook

In `runSkuPipeline`, for SKUs whose id includes `SEO` and when `intake.website_url`
is present, the brief is enriched with:

```jsonc
"_agent_data": {
  "provider": "semrush" | "dataforseo" | "none",
  "cached": true,
  "fetched_at": "…",
  "keywords": [ { "keyword", "volume", "cpc", "difficulty" } ],   // top 20
  "competitors": [ { "domain", "organicKeywords", "traffic" } ]    // top 5
}
```

Best-effort: any fetch error is swallowed — it never blocks the pack run, and
`SkuRunResult` contracts are unchanged.

## APIs (platform-admin, `requirePlatformClaims`)

- `GET /api/os/agent-data` → `{ summary, recent[], integrations }`
- `POST /api/os/agent-data/refresh` `{ domain, queryTypes?, database? }` → fetch + cache

Dashboard: **`/os/agent-data`** — integration counts, cache entries, 24h fetches,
manual refresh, recent-cache table with cache/expired badges. Honest empty state
when no provider is configured.

## Env vars

```
SEMRUSH_API_KEY            # optional global Semrush key (fallback to per-user integration)
DATAFORSEO_LOGIN           # optional
DATAFORSEO_PASSWORD        # optional
```

Without any of these, the agent-data layer returns empty snapshots and packs
continue with LLM-only content (no crash, no silent mock — the UI says so).
