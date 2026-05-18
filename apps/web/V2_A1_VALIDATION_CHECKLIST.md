# NELVYON V2-A1 — Functional Validation Checklist

Use this checklist before demos and commercial validation calls.

## A) Deals list + filters

- [ ] Deals list loads in workspace context.
- [ ] Stage filter works and returns coherent results.
- [ ] Owner filter works and returns coherent results.
- [ ] Empty state is clear when no records match.

## B) Deal detail execution

- [ ] Deal detail opens from list.
- [ ] Stage update persists after save and refresh.
- [ ] Owner update persists after save and refresh.
- [ ] Next step update persists after save and refresh.

## C) Follow-up activity

- [ ] Follow-up can be created from deal detail.
- [ ] Due date is optional but persists when set.
- [ ] New follow-up appears in deal follow-up list.

## D) Risk + conversion visibility

- [ ] Deals at risk panel renders without error.
- [ ] At-risk logic identifies expected overdue/stalled examples.
- [ ] Mini conversion/leakage panel renders stage distribution.

## E) Access control + tenant scope

- [ ] Non-operator role cannot mutate deal fields.
- [ ] Operator/admin role can mutate deal fields.
- [ ] Switching workspace changes dataset correctly.
- [ ] No cross-workspace data appears.

## F) Product quality gates

- [ ] `typecheck` green
- [ ] `lint` green
- [ ] `test` green
- [ ] `gate` green
