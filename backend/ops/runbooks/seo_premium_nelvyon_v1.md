# NELVYON Premium OS Standards — SEO v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

SEO Premium OS Standards for NELVYON v1

## ROUTE CONTEXT (operations)

SEO is primarily **release hygiene, correctness, and i18n awareness**—not a crawler dashboard inside NELVYON v1 OS. Operational hooks:

- `/os/i18n` — default/enabled locales, critical module readiness, hotspot debt (P1/P2)
- `/os/excellence/golden-path` — READY contract before deploying SEO-sensitive changes
- Branding/policy surfaces `/app/branding/policy`, `/app/branding/preview-v2` — when public-facing identity metadata must stay policy-consistent

---

## Scope (minimum real)

- **Technical baseline:** Canonical URLs and meta ownership are defined outside this runbook where applicable (hosting/stack); internally, changes are gated by tests and QA checklist evidence.
- **Content/locale coherence:** Prefer aligned copy strategy with recorded i18n baseline before large marketing or indexable surfaces change.
- **Regression discipline:** SPA/web changes that alter routes, redirects, or public HTML shells require golden path PASS.
- **Honest labeling:** Pilot or internal-only surfaces are not positioned as SEO-complete without measurable crawl/index validation in your external tooling.

---

## Limits (explicit non-goals)

- Does not mandate a specific SERP tooling subscription or crawler product.
- Does not replace editorial keyword strategy—that remains business-owned.
- Does not encourage “SEO hacks” conflicting with CLOSED fronts or brand policy.

---

## Premium checklist (SEO)

| Area | Premium expectation |
| --- | --- |
| READY gate | Golden path green before RELEASE. |
| Locales | `/os/i18n` consulted when shipping multi-locale-facing changes. |
| Policy | Tenant branding inputs respect `/app/branding/policy` when identity affects outbound/public assets. |
| Observability | If SEO-related deployments correlate with spikes in web/API errors, use `/os/observability` + incidents drilldown. |
| DEBT TRACKING | P1 hotspots on `/os/i18n` prioritized before major indexable pushes. |

---

## Recommended cadence

- **Before indexable/marketing-heavy releases:** i18n baseline review + checklist pass.
- **Monthly:** Reconcile hotfix debt on `/os/i18n` with roadmap (still no mass refactor without new front).

---

## Mini X‑EXEC

1. Open `/os/i18n`; note default locale and any P1 `partial/pending` modules relevant to public pages.
2. Open `/os/excellence/golden-path`; confirm SEO-related code change would still require full gate before READY.
3. Open `/os/qa/checklist`; pick one evidence path and verify it still resolves in the app.
4. If branding touches public identity, open `/app/branding/policy` and confirm effective field states match intent.
