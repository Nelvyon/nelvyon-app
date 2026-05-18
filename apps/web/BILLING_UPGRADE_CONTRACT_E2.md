# Billing Upgrade Contract (E2)

This document captures the real backend contract used by the self-service upgrade journey in `apps/web`.

## Endpoints used (no invented frontend logic)

- `GET /api/v1/payment/plans`
  - Returns `{ plans: [{ plan_id, name, base_price, currency, cycles[] }] }`
- `POST /api/v1/payment/create_payment_session` (tenant scoped, admin-only)
  - Input: `{ plan_id, billing_cycle, promo_code?, success_url, cancel_url }`
  - Output: `{ session_id, url, amount, currency }`
- `POST /api/v1/payment/verify_payment` (tenant scoped, operator+)
  - Input: `{ session_id }`
  - Output: `{ status, plan_id?, billing_cycle?, payment_status, subscription_id? }`
- `GET /api/v1/payment/active_subscription` (tenant scoped)
  - Output: `{ has_subscription, plan_id?, billing_cycle?, status?, ... }`
- Billing views (tenant scoped):
  - `GET /api/v1/billing/summary`
  - `GET /api/v1/billing/usage`
  - `GET /api/v1/billing/invoices`

## Status semantics used in UI

- `verify_payment.status = paid`
  - Session completed and backend activated subscription.
- `verify_payment.status = pending`
  - Session still open/incomplete; user sees pending guidance.
- `verify_payment.status = cancelled`
  - Session expired/cancelled; no plan change applied.
- `verify_payment` 403
  - Session/workspace mismatch or role mismatch.
- `create_payment_session` 403
  - Only workspace admin can initiate checkout.

## Known edge cases reflected honestly

- `payment_status` may differ from `status` while checkout is open.
- `checkout=cancelled` URL param can exist without `session_id`; UI shows cancellation and does not verify.
- Pricing is display-oriented; Stripe remains source of truth for charge execution.
