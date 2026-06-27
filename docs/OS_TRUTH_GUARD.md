# OS Truth Guard (O30)

Unified **pre-publish** rules for **landing**, **email**, and **ads** copy. Deterministic
checks only — reuses O27 `scanClaims` and O18 legal slice from `visualQaEngine`. No LLM.

## Channels & rules (v1)

| Channel | Checks |
|---------|--------|
| **landing** | Prohibited claims + legal terms |
| **email** | Deceptive subject patterns + claims + legal |
| **ads** | Headline/description min length + claims + legal (legal fail → warning) |

Status: `passed` | `warning` | `blocked`.

## Integration

- **packOrchestrator** — after O27 shield, `evaluateAndPersist({ channel: 'landing' })` →
  `truth_status` on `SkuRunResult`; `needs_review` if `blocked`.
- **SaasCampaniasService.launchCampania** — email campaigns blocked before send if `blocked`.
- **portal approve** — `truth_status === 'blocked'` → `TRUTH_BLOCKED` (same pattern as O27).

## Relation to O18 / O27

- **O18 QA Gate** — visual ≥85, lighthouse proxy, legal in pack pipeline.
- **O27 Shield** — EU disclaimers + regulated sector portal block.
- **O30 Truth Guard** — cross-channel pre-publish layer (landing + email + optional ads UI).

## APIs

- `GET /api/os/truth-guard` → `{ summary, audits[] }`
- `GET /api/os/truth-guard/[id]` → `{ audit }`
- `POST /api/os/truth-guard/evaluate` → `{ channel, text, subject?, headline?, description? }`

Dashboard: `/os/truth-guard`.

## v1 deferred

- SaasAdsDashboardService `createCampaign` hook (optional §5).
- LLM / real legal advice.
