# OS Regulated Sector Shield (O27)

Enforces EU compliance for regulated sectors: a mandatory disclaimer + a prohibited
claims scan, blocking portal publication when a regulated deliverable fails — no human
in the normal loop. v1 uses fixed Spanish disclaimer templates and a deterministic
regex set; it is **not** legal advice.

## Regulated sectors

Resolved from `sectorRegistry` (`profile.regulated`, O16) with a static fallback set:
dental, legal, beauty, solar, seguros, contabilidad, medical, pharmacy, finance, salud,
clinica.

## EU disclaimers (v1)

`EU_DISCLAIMERS` maps sector → required disclaimer text (≥8 regulated sectors). A
deliverable for a regulated sector must contain the sector's disclaimer key-phrases
(`hasRequiredDisclaimer`), otherwise the shield blocks.

## Prohibited claims

`PROHIBITED_CLAIMS` (regex) catches: curación/resultados garantizados, "100% efectivo",
rentabilidad/ganancias garantizadas, "duplica tu dinero", asesoramiento legal vinculante,
cura de enfermedades, "milagroso/infalible", etc. `scanClaims(text)` returns the
violations; the visual QA legal slice (O18) is folded in best-effort.

## Status rules (`computeShieldStatus`)

- regulated + (missing disclaimer **or** failed claims) → **blocked**
- regulated + all ok → **passed**
- non-regulated + failed claims → **warning** (never a hard block)
- else → **passed**

## Portal block

`approvePortalDeliverableBff` reads `sector`/`sector_id` + `shield_status` from the
deliverable metadata and calls `canPublishToPortal`. If not allowed it throws
`SHIELD_BLOCKED` with an honest reason — the client cannot approve a blocked regulated
deliverable.

## Pack orchestrator

After the O18 QA gate, `runSkuPipeline` calls `evaluateAndPersist` (sector + personalized
copy), records `shield_status` on the SKU result, and a `blocked` status feeds
`needs_review` (alongside `qa_gate_status === "blocked"`). Best-effort: failures never
block the run.

## Audit trail

Every evaluation persists to `os_sector_shield_audits` (status, regulated, disclaimer_ok,
claims_ok, violations, checks). Surfaced at `/os/shield` and via the APIs.

## APIs

- `GET /api/os/shield` → `{ summary, audits[] }`
- `GET /api/os/shield/[sectorId]` → disclaimer template + recent audits
- `POST /api/os/shield/evaluate` → `{ sectorId, text, packRunId? }` manual scan

## Relation to O18 / S50

- **O18 legal** — the visual QA legal slice is a secondary claims source folded into the
  shield scan.
- **S50 vault** — blocked shield audits are candidates for a `sector_disclaimer` consent
  record (deferred; not auto-written in v1 to keep the vault contract stable).
