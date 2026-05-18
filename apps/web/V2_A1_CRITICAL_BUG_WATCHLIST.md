# NELVYON V2-A1 — Critical Bug Watchlist

Focus only on bugs that break demo flow, value journey, or trust.

## P0 (fix immediately)

- Deal updates saved but not reflected after refresh (stage/owner/next step mismatch).
- Follow-up creation reports success but record is missing.
- Cross-workspace data leakage in deals or follow-ups.
- Unauthorized role can mutate stage/owner/next step.
- Deals list or detail crashes for standard workspace data.

## P1 (fix before active selling week)

- Filters return inconsistent results for stage/owner.
- At-risk panel marks clearly healthy deals as risky (or misses obvious risks).
- Conversion panel shows empty/invalid values with valid backend response.
- Error states are unclear and block operator action recovery.

## Operational signals to monitor during validation

- % of demos completing full V2-A1 script without manual workaround.
- # of mutation attempts rejected unexpectedly for valid operator/admin.
- # of follow-up creation failures per session.
- # of "data looked stale/confusing" comments from prospects/users.

## Bug triage rule for V2-A1 freeze

- Fix only if issue affects:
  - sellability (demo breaks),
  - core value path (execution/follow-up/risk visibility),
  - trust (RBAC/tenant isolation/data correctness).
- Defer everything else to V2-A2+ backlog.
