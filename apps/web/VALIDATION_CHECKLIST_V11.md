# NELVYON v1.1 — Quick Validation Checklist

Use this checklist for demo readiness, business validation, and self-service confidence.

## A) Can activate solo

- [ ] User can sign in and select workspace.
- [ ] Onboarding checklist is visible and actionable.
- [ ] Core first workflow can be completed without support intervention.
- [ ] Role restrictions are clear when a user lacks permission.

## B) Can resolve doubts with help/bot

- [ ] Help center content is reachable from relevant modules.
- [ ] Search returns useful matches for common questions.
- [ ] Structured forms create correct helpdesk path (bug/help/feedback).
- [ ] Bot returns concise actionable response for known topics.
- [ ] Bot uses honest fallback/handoff for low-confidence questions.

## C) Can change plan solo

- [ ] Billing overview shows current plan/usage/invoices consistently.
- [ ] Upgrade page lists real plans and billing cycles.
- [ ] Admin can start checkout session successfully.
- [ ] Return path verifies payment (`paid`/`pending`/`cancelled`) honestly.
- [ ] Active subscription refreshes and billing screens reflect new state.
- [ ] Non-admin cannot start plan change (forbidden behavior is explicit).

## D) Security and confidence checks

- [ ] Settings > Audit & security is visible for authorized roles.
- [ ] Event feed shows event type, actor, timestamp, result/severity.
- [ ] Recent security activity appears in Settings.
- [ ] No cross-workspace leakage observed when switching workspace context.

## E) Release gate checks

- [ ] `typecheck` green
- [ ] `lint` green
- [ ] `test` green
- [ ] `gate` green

If all boxes are green, treat `apps/web` as sellable `v1.1 CERRADO`.
