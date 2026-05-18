# NELVYON Premium OS Standards — Ads v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Ads Premium OS Standards for NELVYON v1 (governance, measurement hygiene, no scope creep)

## ROUTE CONTEXT (operations)

Advertising operations must not bypass platform stability or tenant policy. Internal references:

- `/os/excellence/golden-path` — non-negotiable READY path for any change touching tracking, pixels, or spend-related integrations
- `/os/observability` + `/os/observability/incidents` — detect spikes after deploys that add network calls or new third-party scripts
- `/os/global/risk-queue` — when cross-workspace blast radius is possible (e.g., shared tags, shared domains)
- `/os/tenants/activation` + `/app/branding/policy` — when ads creative or landing experiences depend on tenant branding governance

---

## Scope (minimum real)

- **Release discipline:** Ads-related code/config changes follow golden path; no “marketing exception” branch.
- **Privacy & consent posture:** Document externally with legal/compliance owners; this runbook only enforces engineering discipline and observability response.
- **Performance & failure visibility:** After changes that load third-party assets, confirm observability window is clean or triaged.
- **Tenant boundaries:** Multi-tenant ads experiments do not leak configuration across workspaces without explicit governed change.

---

## Limits (explicit non-goals)

- Does not choose or mandate Google/Meta/TikTok/etc. as required vendors.
- Does not implement consent management product features here.
- Does not authorize pixel sprawl or unreviewed third-party script injection.

---

## Premium checklist (ads)

| Area | Premium expectation |
| --- | --- |
| READY | Golden path fully green. |
| STABILITY | Post-deploy observability reviewed for error/latency regressions. |
| GOVERNANCE | Branding/policy alignment when creatives land on tenant-branded surfaces. |
| BLAST RADIUS | Global risk queue consulted when tagging might affect multiple workspaces. |
| TRACEABILITY | Incidents drilldown favors `request_id` correlation where API paths are impacted. |

---

## Recommended cadence

- **Per ads-related RELEASE:** Mandatory golden path + short observability check same day.
- **Weekly:** Sanity pass on hotspot debt if `/os/i18n` impacts landing copy/translations tied to campaigns.

---

## Mini X‑EXEC

1. Open `/os/excellence/golden-path` and verbally confirm ads work is treated like any RELEASE-gated engineering change.
2. Open `/os/observability` after hypothetical ads deploy playbook; validate what “clean” vs “investigate” means for your baseline.
3. Open `/os/observability/incidents` tabletop: confirm operators know how to use correlation context for suspected tag/API failures.
4. If campaign landers use branded chrome, verify `/app/branding/policy` state matches `/os/tenants/activation` expectations for advanced branding.
