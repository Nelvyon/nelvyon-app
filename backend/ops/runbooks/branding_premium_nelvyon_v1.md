# NELVYON Premium OS Standards — Branding v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Branding Premium OS Standards for NELVYON v1 (identity delivery, policy alignment, no external design APIs)

## ROUTE CONTEXT (operations)

Branding work must stay aligned with tenant policy and existing product surfaces. Internal references:

- `/app/branding/policy` — effective field states (enabled / blocked / inherited) and reasons
- `/os/tenants/activation` — branding v2 advanced activation with preconditions and log
- `/app/branding/preview-v2` — local policy-aware preview (no global reskin)
- `/os/excellence/golden-path` — READY path before shipping identity-affecting changes
- `/os/i18n` — copy and locale debt when brand voice ships across languages

---

## Scope (minimum real)

- **Policy-first delivery:** Public-facing identity changes respect workspace plan, HQ lock, and activation state documented in product — not ad-hoc overrides.
- **Artifact discipline:** Logo, color, type, and voice tokens are versioned in handoff — this OS template tracks status and evidence, not Figma/Cloud API sync.
- **Regression discipline:** Changes that affect `/app/branding` or client-visible chrome require golden path green.
- **Honest labeling:** “Premium” here means structured OS delivery and checklists — not a substitute for legal trademark review or full design-system automation.

---

## Limits (explicit non-goals)

- Does not connect to Figma, Adobe, or font subscription APIs in v1.
- Does not perform global app reskin, custom domains, or CDN — those stay in their own governed fronts.
- Does not replace legal review of trademark and usage rights.

---

## Premium checklist (branding)

| Area | Premium expectation |
| --- | --- |
| READY | Golden path green before releasing identity changes. |
| POLICY | `/app/branding/policy` reviewed for the target workspace; activation on `/os/tenants/activation` matches intended v2 use. |
| PREVIEW | `/app/branding/preview-v2` used to validate policy matrix before claiming “ready for landers.” |
| CONSISTENCY | Token set (logo, color, type, voice) coherent across deliverable sections; no orphan assets. |
| I18N | If brand voice extends to multiple locales, `/os/i18n` debt is acknowledged before cutover. |

---

## Recommended cadence

- **Per branding release:** Golden path + policy/preview pass + this checklist.
- **Quarterly:** Reconcile brandbook version numbers and storage locations in ops notes (outside this app if needed).

---

## Mini X‑EXEC

1. Open `/os/branding-premium/preview` and walk deliverable sections for the demo project.
2. Open `/app/branding/policy` and confirm field states match the story told in the audit.
3. Open `/app/branding/preview-v2` and confirm blocked vs allowed behavior is understood.
4. If multi-locale: open `/os/i18n` and note P1 debt before large creative swap.
