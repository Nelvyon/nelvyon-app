# NELVYON Premium OS Standards — Web v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Web Premium OS Standards for NELVYON v1

## ROUTE CONTEXT (operations)

Premium web delivery is enforced through operational review, not through a dedicated product route. Align execution with:

- `/os/excellence/golden-path` — RELEASE gate contract (`pnpm gate`, tests, lint, typecheck)
- `/os/qa/checklist` — baseline core-flow inspection before declaring web-related change “ready”
- `/os/observability` — stability signals after deploy or config change affecting web/API

---

## Scope (minimum real)

- **Release discipline:** Every web-facing or web-app change follows the golden path before merge/release.
- **Quality bar:** Lint and typecheck clean; smoke and relevant suites green; no “skip gate” shortcuts.
- **Runtime stability:** Post-change spot-check critical paths listed in QA checklist routes (auth/workspace/branding/etc. as applicable).
- **Evidence:** Operational owner can cite last successful gate command and observable health in observability snapshots when relevant.

---

## Limits (explicit non-goals)

- Does not redefine NELVYON product scope or reopen closed fronts.
- Does not replace CI/CD pipelines; references them as contractual checks only.
- Does not mandate a specific CDN, edge provider, or hosting vendor.
- Does not promise sub-second global SLO unless separately agreed and measured.

---

## Premium checklist (web)

| Area | Premium expectation |
| --- | --- |
| Build correctness | Typecheck + lint pass on the web package before READY. |
| Regression safety | `pnpm gate` green for the promoted change set. |
| Errors | No unexplained spikes in `/os/observability` aligned with deploy window. |
| Branding/policy | Tenant-visible surfaces respect branding policy when touching `/app/branding*` flows. |
| Documentation | Operational note or change-journal convention followed for notable web releases. |

---

## Recommended cadence

- **Per change:** Golden path steps completed; QA checklist skimmed if user-facing routes touched.
- **Weekly:** Spot review of observability correlation with releases; revisit `/os/i18n` if shipping copy-heavy UI.

---

## Mini X‑EXEC

1. Open `/os/excellence/golden-path` and verify the mandatory step list matches the current contract (`typecheck`, `lint`, relevant tests, `pnpm gate`).
2. Run golden path locally on a clean branch touching web; confirm all steps green.
3. Open `/os/qa/checklist` after a trivial web fix; confirm items and evidence routes still coherent.
4. If a deploy occurred, open `/os/observability` within 24h and confirm no sustained CRIT on core signals without a tracked cause.
