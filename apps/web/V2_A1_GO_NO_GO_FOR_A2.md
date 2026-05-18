# NELVYON V2-A1 — Go/No-Go Criteria for V2-A2

Decision objective: move to V2-A2 only if V2-A1 proves real commercial utility and stable execution.

## Go to V2-A2 when all are true

- Demo reliability:
  - At least 5 demo runs with no P0 failures.
- Functional confidence:
  - Checklist completion >= 90% across validation sessions.
- Commercial signal:
  - Prospects/users explicitly value owner accountability + next step + follow-up + risk visibility.
- Trust signal:
  - No RBAC/tenant-scope critical incidents.
- Operational stability:
  - P0 open count = 0 and P1 backlog controlled.

## No-Go (stay on V2-A1 hardening) if any is true

- Any unresolved P0 in core journey.
- Recurrent data consistency issues between list/detail/panels.
- Follow-up flow perceived as unreliable by operators.
- Access control behavior unclear in customer-facing demos.

## Decision cadence

- Run evaluation every 1-2 weeks during commercial validation.
- If Go criteria hold in two consecutive checkpoints, open V2-A2 scope.
- If No-Go, keep freeze discipline: fix criticals only, no feature expansion.
